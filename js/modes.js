import {combatProfile} from './combat.js';
import { healthPressure } from './challenge.js';
import { armyPressure } from './runway.js';
import { BALANCE as B } from './config.js';

/** 等级只小幅增加尸潮数量；关卡决定基础强度，成长不会被同倍率抵消。 */
export function difficulty(mode, level = 1, squad = B.track.startSquad) {
  const stage = mode.kind === 'campaign' ? mode.stage : 1 + Math.floor((mode.wave - 1) / B.wavesPerStage);
  const local = mode.kind === 'campaign' ? mode.local : 1 + (mode.wave - 1) % B.wavesPerStage;
  const power = Math.max(0, level - 1);
  const extra=Math.max(0,(typeof squad==='bigint'?armyPressure(squad):Number(squad))-B.adaptive.baseSquad);
  return {
    population: Math.round(B.spawnCount + B.spawnGrowth * (stage - 1) ** B.spawnStagePower + B.spawnWaveGrowth * (local - 1) + B.spawnLevelGrowth * power + B.adaptive.budgetPerMember*extra),
    pack: Math.min(B.enemies, B.packBase + B.packStageGrowth * (stage - 1) + B.packWaveGrowth * (local - 1) + Math.floor(power / B.packLevelDivisor)+Math.floor(extra*B.adaptive.packPerMember)+(mode.aoe?8:0)),
    interval: Math.max(B.packMinInterval, B.packInterval / (1 + B.packIntervalStage * (stage - 1) + B.packIntervalWave * (local - 1) + B.packIntervalLevel * power + extra*B.adaptive.intervalPerMember)),
    stage, local
  };
}
export class Mode {
  constructor(kind, stage = 1) {
    this.kind = kind;
    this.stage = stage;
    this.local = 0;
    this.wave = kind === 'campaign' ? (stage - 1) * B.wavesPerStage : 0;
    this.started = false;
    this.pressureSquad = null;
    this.healthPressure = null;
  }

  next(game) {
    this.wave++;
    this.local++;
    this.elapsed = 0;
    this.spawnTimer = this.local === 1 && this.stage === 1 ? B.openingDelay : 1;
    if(this.pressureSquad===null)this.pressureSquad=combatProfile(game.p).pressure;
    if(this.healthPressure===null)this.healthPressure=healthPressure(game.p?.squad??B.track.startSquad);
    this.aoe=combatProfile(game.p).aoe;this.budget = difficulty(this, game.p?.level,this.pressureSquad).population;
    this.remaining = this.budget;this.fireHP??=combatProfile(game.p).hp;this.aoe=combatProfile(game.p).aoe;
    this.bossWave = this.kind === 'campaign'
      ? this.local === B.wavesPerStage
      : this.wave % B.bossEvery === 0;
    this.bossSpawned = false;
    this.warned = false;
    this.packet = 0;
    this.started = true;
    game.ui.toast('第 ' + this.wave + ' 波 · 尸潮 ' + this.remaining + ' 只');
  }

  spawnPack(game) {
    // 批次随等级和路段递增；第一波只出现普通小怪。
    const profile=combatProfile(game.p),columns=profile.columns;const center=Math.max(160,Math.min(560,game.p.x));
    const limit = Math.min(this.remaining, B.enemies - game.enemies.count, difficulty(this, game.p?.level,this.pressureSquad).pack);
    const shift = (this.packet++ % 2) * 8;
    for (let i = 0; i < limit; i++) {
      const roll = Math.random();
      const type = this.wave === 1 ? 0 : this.wave > 2 && roll > B.tankThreshold - Math.min(.35,Math.max(0,this.pressureSquad-2)*B.adaptive.elitePerMember) ? 2 :
        this.wave > 1 && roll < B.bomberChance ? 3 : roll < B.fastChance ? 1 : 0;
      const enemy = game.spawnEnemy(type);
      if (!enemy) break;
      enemy.x = enemy.px = center + (i%columns-(columns-1)/2)*38;
      enemy.y = enemy.py = 155 - Math.floor(i / columns) * 28 + Math.random() * 18;
      this.remaining--;
    }
  }

  update(game, dt) {
    if (!this.started) this.next(game);
    this.elapsed += dt;const profile=combatProfile(game.p);this.aoe=profile.aoe;this.fireHP=(this.fireHP??profile.hp)+(profile.hp-(this.fireHP??profile.hp))*(1-Math.exp(-dt/B.director.response));
    const target=combatProfile(game.p).pressure;
    this.pressureSquad+=(target-this.pressureSquad)*(1-Math.exp(-dt/B.adaptive.response));
    this.healthPressure+=(healthPressure(game.p?.squad??B.track.startSquad)-this.healthPressure)*(1-Math.exp(-dt/B.adaptive.response));
    const budget=difficulty(this,game.p?.level,this.pressureSquad).population;
    // 仅追加新增预算，已经投入的敌人不会消失；人数减少时后续批次会放缓。
    if(budget>this.budget){this.remaining+=budget-this.budget;this.budget=budget;}
    if (this.bossWave && !this.bossSpawned) {
      if (!this.warned && this.elapsed >= B.bossArrival - 3) {
        this.warned = true;
        game.ui.toast('关底巨兽接近 · 在突破防线前击破重甲');
      }
      if (this.elapsed >= B.bossArrival && game.enemies.count < B.enemies) {
        game.spawnEnemy(4);
        this.bossSpawned = true;
      }
    }
    this.spawnTimer -= dt;
    if (this.remaining > 0 && this.spawnTimer <= 0) {
      this.spawnPack(game);
      this.spawnTimer = difficulty(this, game.p?.level,this.pressureSquad).interval;
    }
    if (this.elapsed >= B.waveDuration && this.remaining === 0 && game.enemies.count === 0) {
      if (this.kind === 'campaign' && this.local >= B.wavesPerStage) game.finish(true);
      else this.next(game);
    }
  }
}
