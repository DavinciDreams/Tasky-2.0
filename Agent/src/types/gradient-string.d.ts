declare module 'gradient-string' {
  interface Gradient {
    (text: string): string;
    multiline(text: string): string;
  }

  interface GradientFunction {
    (...colors: string[]): Gradient;
    atlas: Gradient;
    cristal: Gradient;
    teen: Gradient;
    mind: Gradient;
    morning: Gradient;
    vice: Gradient;
    passion: Gradient;
    fruit: Gradient;
    instagram: Gradient;
    retro: Gradient;
    summer: Gradient;
    rainbow: Gradient;
    pastel: Gradient;
  }

  const gradient: GradientFunction;
  export = gradient;
}
