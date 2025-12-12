import { MathConfig, defaultMathConfig } from '@config/mathConfig';

export const hotSpinMathConfig: MathConfig = {
  ...defaultMathConfig,
  // Hot Spin math targets ~96% effective RTP on a 10x wager by lifting expected payout per base bet.
  baseRtp: 9.6,
  coinValueDistribution: {
    GREEN: {
      onOwn: [
        { value: 1, weight: 0.2 },
        { value: 2, weight: 0.18 },
        { value: 3, weight: 0.15 },
        { value: 5, weight: 0.12 },
        { value: 10, weight: 0.1 },
        { value: 25, weight: 0.1 },
        { value: 50, weight: 0.08 },
        { value: 100, weight: 0.07 }
      ],
      onOpposite: defaultMathConfig.coinValueDistribution.GREEN.onOpposite
    },
    ORANGE: {
      onOwn: [
        { value: 1, weight: 0.2 },
        { value: 2, weight: 0.18 },
        { value: 3, weight: 0.15 },
        { value: 5, weight: 0.12 },
        { value: 10, weight: 0.1 },
        { value: 25, weight: 0.1 },
        { value: 50, weight: 0.08 },
        { value: 100, weight: 0.07 }
      ],
      onOpposite: defaultMathConfig.coinValueDistribution.ORANGE.onOpposite
    }
  }
};
