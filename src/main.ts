import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { ReplayLevelsScene } from './scenes/ReplayLevelsScene';
import { GameScene } from './scenes/GameScene';
import { ShopScene } from './scenes/ShopScene';
import { PreLevelScene } from './scenes/PreLevelScene';
import { MiniGameHubScene } from './scenes/MiniGameHubScene';
import { SpinWheelScene } from './scenes/SpinWheelScene';
import { TreasureHuntScene } from './scenes/TreasureHuntScene';
import { LuckyMatchScene } from './scenes/LuckyMatchScene';
import { StackSortScene } from './scenes/StackSortScene';
import { TreasureDigScene } from './scenes/TreasureDigScene';
import { BridgeBuilderScene } from './scenes/BridgeBuilderScene';
import { PinPullScene } from './scenes/PinPullScene';
import { PipeConnectScene } from './scenes/PipeConnectScene';
import { SaveTheRoomScene } from './scenes/SaveTheRoomScene';
import { ParkingJamScene } from './scenes/ParkingJamScene';
import { SlingshotScene } from './scenes/SlingshotScene';
import { CONFIG } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CONFIG.SCREEN.WIDTH,
    height: CONFIG.SCREEN.HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [
    TitleScene,
    LevelSelectScene,
    ReplayLevelsScene,
    GameScene,
    ShopScene,
    PreLevelScene,
    MiniGameHubScene,
    SpinWheelScene,
    TreasureHuntScene,
    LuckyMatchScene,
    StackSortScene,
    TreasureDigScene,
    BridgeBuilderScene,
    PinPullScene,
    PipeConnectScene,
    SaveTheRoomScene,
    ParkingJamScene,
    SlingshotScene,
  ],
};

new Phaser.Game(config);
