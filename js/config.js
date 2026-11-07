export const PALETTE = Object.freeze({
  road:'#484c49', rail:'#a8aaa0', roadLine:'#d3c9a1', uniform:'#3e82be', helmet:'#ebc252', skin:'#a1c9ab', bg:'#141d25', panel:'#13182b', grid:'#22304a', player:'#55f5e5', normal:'#62b6a0', fast:'#fa5da9', tank:'#a6b876', bomber:'#ffb454', boss:'#ff4c91',
  bullet:'#ffe59a', crit:'#ffd37b', hp:'#ff617c', ui:'#55f5e5', secondary:'#a5abc5', text:'#eef5ff', white:'#ffffff', black:'#000000', blue:'#5daeff', purple:'#c185ff', gold:'#ffd37b'
});
/** 门符号独立随机50/50；加法门无收益上限，每0.18秒有效命中增加1。
 * 门到底必结算，不检查站位；倍数仍按十分位并限制3倍，避免指数失控。
 * 密度随当前编队2秒平滑跟踪：120以下线性，之后每翻倍+100压力。
 * 第3关起HP=1.28*1.52^(stage-2)*(1+.03*(stage-3)^2)，无限每3波视作一关。
 * 防线固定120HP，每只漏怪独立扣10且本局不可修复；免疫/装甲不抵消漏怪。
 * 普通命中与暴击都不冻结模拟，改用低幅震动、白闪和限频飘字。 */
export const BALANCE = Object.freeze({
  director:Object.freeze({rateCap:240,response:3}),
  lootCost:Object.freeze({damage:12,rate:16,range:16,magnet:12,pierce:30,multi:45,blast:55,slow:32,breaker:40,focus:36,close:30,execute:55,recruit:180,turret:70,grenade:50,laser:110}),
  arsenal: Object.freeze({maxSquad:5,recruitEvery:4,permanentMagnet:12,pickupRadius:14,cardTouch:48,cardSpeed:85,cardInterval:9,cardJitter:5,cardHits:5,cardRarityHits:3,maxCards:2,grenadeRadius:155,grenadeRatio:7,grenadeDelay:.65,turretLife:10,turretRate:.22,turretRatio:.65,laserRatio:18,laserWidth:34,maxCharges:3,shieldBoss:.8,shieldElite:.55,shieldHitTime:.26,shieldBreakTime:.7,shieldBreakBonus:1.15,rangeStep:2,gateWeaponMin:0}),
  weapons: Object.freeze([
    {name:'制式手枪',points:0,damage:14,rate:.72,pellets:1,pierce:0,color:'gold'},
    {name:'疾风冲锋枪',points:8,damage:16,rate:.25,pellets:1,pierce:0,color:'blue'},
    {name:'突击步枪',points:25,damage:28,rate:.18,pellets:1,pierce:0,color:'player'},
    {name:'三联霰弹枪',points:55,damage:24,rate:.24,pellets:3,pierce:0,color:'bomber'},
    {name:'重型机枪',points:100,damage:36,rate:.10,pellets:1,pierce:1,color:'purple'},
    {name:'脉冲穿甲枪',points:180,damage:50,rate:.12,pellets:2,pierce:2,color:'gold'}
  ]),
  track: Object.freeze({
    playerY:990, startX:192, upgradeX:192, gateRight:528, hordeX:360, hordeLeft:84, hordeRight:636, startSquad:1, maxMultiplier:3, hostileGateAt:20, hostileGateHighAt:100, hostileGateChance:.8, hostileGateHighChance:.9, gateAddMicros:180000, gateDivideMicros:110000, gateMultiplyMicros:300000, gateMultiplyGrowth:1.35, gateHitWindow:.38, gateChargeSlow:1, visibleTroopers:30, maxTracers:42, hostileReserve:28, columns:5, spacing:32, rowSpacing:28,
    scroll:245, encounterInterval:8, gateHalfWidth:100, chargeHits:4, multiplierHits:10,
    drumHits:4, blastRadius:195, blastDamage:240, openingSize:3, openingStageGrowth:3, openingMax:20,
    strafeFactor:3, forwardSpeed:40, memberDamage:.85, fanMax:.24, fanGrowth:.008
  }),
  summonShare:6,specialArmyPower:.5,specLevel:5,artilleryDamage:1.25,artilleryRate:1.1,elementDamage:.9,engineerArmor:.1,breachBonus:.2,salvoRate:.92,conductionBonus:.2,igniteRatio:.6,supportRate:.8,supportDamage:.35,repairOnKill:.2,executionThreshold:.35,executionMultiplier:2,overloadMultiplier:1.6,swarmRate:.65,swarmDamage:1.5,
  maxShots:15,maxSummons:6,maxChain:8,maxCrit:.85,maxArmor:.7,minFireInterval:.06,normalShots:1,rangerShots:2,
  laserShots:5,laserPierce:3,stormChain:2,stormFreeze:1,eclipseAura:2,eclipseBurn:2,
  challenge: Object.freeze({startStage:3,shieldStage:4,artilleryStage:5,doubleStage:7,
    lateHPGrowth:1.23,lateHPQuadratic:.015,damageGrowth:.09,healthPower:.85,
    shieldRatio:.45,shieldResistance:.35,shieldPierce:2,breakWindow:2,breakBonus:1.35,
    armorSeconds:3,exposedSeconds:2.5,armorFactor:.25,exposedFactor:1.35,
    firstAttack:.7,attackInterval:5,attackMin:3,attackStageStep:.13,enrageStep:.5,
    warning:1.7,lateWarning:1.35,blastWidth:94,doubleWidth:56,
    blastHealth:.34,blastHealthGrowth:.012,squadLossDivisor:5,woundSeconds:3,woundHealing:.2,
    eliteInterval:6,eliteBlastHealth:.2,hazards:6,bossSlowFloor:.8,barrelHealthRatio:.35}),
  adaptive: Object.freeze({response:2,baseSquad:2,densityKnee:120,densityPerDoubling:100,hpPerMember:.085,bossPerMember:.075,packPerMember:.11,intervalPerMember:.012,budgetPerMember:1.1,elitePerMember:.0015}),
  packMinInterval:.5,packGrowth:.025,fastChance:.27,tankThreshold:.88,bomberChance:.10,
  bossFinalHP:1,bossMajorHP:1.6,bossAdvance:10,bossStartY:300,bossBreachY:1050,
  bossWarning:.85,bossDashDuration:.65,hostileBulletLife:8,
  width:720,height:1280,dpr:2,step:1/60,maxSteps:6,enemies:120,bullets:400,particles:300,gems:180,corpses:50,numbers:32,
  breachDamage:10,breachWarning:1.1,playerHP:120,playerSpeed:235,damage:10,fireInterval:1,bulletSpeed:760,bulletLife:1.5,crit:.08,critMultiplier:2,invulnerability:.65,
  enemyHP:[24,18,75,32,650],enemySpeed:[34,70,22,42,32],enemyRadius:[20,16,32,23,80],enemyDamage:[10,8,22,24,30],enemyXP:[4,5,12,7,140],
  hpWave:.13,hpTime:.10,speedWave:.012,speedCap:1.85,easyTime:30,easySpeed:.75,
  wavesPerStage:3,stages:15,waveDuration:16,spawnCount:12,spawnGrowth:24,spawnStagePower:1.35,spawnWaveGrowth:12,spawnLevelGrowth:4,packBase:2,packStageGrowth:3,packWaveGrowth:2,packLevelDivisor:2,packIntervalStage:.35,packIntervalWave:.28,packIntervalLevel:.035,openingDelay:6,hpStageGrowth:1.28,tutorialSlow:.42,bossEvery:10,bossAttack:4,bossShotSpeed:300,bossShots:12,bossShotDamage:16,
  bossArrival:2,packInterval:3,xpBase:24,xpGrowth:1.28,magnet:42,gemSpeed:510,coinKill:1,bossCoins:60,stageCoins:60,
  knockback:4,corpseTime:.85,critFreeze:0,shakeDecay:8,hitShake:9,critShake:4,spread:.12,
  damageUpgrade:1.18,rateUpgrade:.90,speedUpgrade:1.10,hpUpgrade:25,critUpgrade:.06,magnetUpgrade:18,regenUpgrade:.6,armorUpgrade:.07,luckUpgrade:.08,
  leech:.8,thorns:12,explosionRadius:85,explosionRatio:.4,chainRange:145,chainRatio:.45,freezeTime:1.5,freezeSlow:.45,burnTime:3,burnDPS:5,auraRadius:95,auraDPS:8,
  homingTurn:3,droneInterval:.8,droneRatio:.6,orbitRadius:100,orbitDamage:15,orbitInterval:.45,laserRatio:.65,stormRatio:.65,eclipseRatio:1.5,abilityInterval:1,
  healUpgrade:40,xpBonus:.15,shopBase:80,shopGrowth:1.65,shopMax:8,permanentDamage:.08,permanentHP:15,permanentSpeed:.025,permanentLuck:.01,unlockCost:350,
  rangerSpeed:1.12,rangerHP:.8,rangerDamage:.8,rangerRate:.8,rerolls:1,rerollUpgrade:1,
  rarityWeights:[60,25,12,3],qualityLowFPS:52,qualityHighFPS:58,qualityMin:.3
});
