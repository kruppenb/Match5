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

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
    min: {
      width: 320,
      height: 480,
    },
    max: {
      width: 1920,
      height: 1920,
    },
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
