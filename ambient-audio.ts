/**
 * Calm, spiritual ambient music synthesised in the browser with the Web Audio API:
 * a tanpura-style drone (Sa–Pa–Sa) with slow breathing, gentle plucks and
 * occasional soft bell notes from a pentatonic scale, all washed in reverb.
 * No audio files, no licences — runs entirely on-device.
 */
const SA = 136.1; // the traditional "Om" frequency (Hz)
const PA = 204.15; // perfect fifth above Om
const SA_HI = 272.2; // octave
const SA_LO = 68.05; // sub-octave for depth
const BELLS = [277.18, 311.13, 349.23, 415.3, 466.16, 554.37, 622.25];

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private timers: number[] = [];
  private wet: GainNode | null = null;
  running = false;

  get supported() {
    return typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window);
  }

  async start() {
    if (!this.supported) return false;
    if (!this.ctx) {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
      this.ctx = new AC();
    }
    try {
      await this.ctx.resume();
    } catch {
      return false;
    }
    if (this.ctx.state !== "running") return false;
    if (!this.running) this.build();
    this.running = true;
    return true;
  }

  async stop() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 1.2);
    this.timers.forEach((id) => window.clearInterval(id));
    this.timers = [];
    const ctx = this.ctx;
    const nodes = this.nodes;
    window.setTimeout(() => {
      nodes.forEach((n) => {
        try {
          if ("stop" in n && typeof (n as OscillatorNode).stop === "function") (n as OscillatorNode).stop();
          n.disconnect();
        } catch {}
      });
      void ctx.suspend();
    }, 1300);
    this.nodes = [];
    this.running = false;
  }

  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  private build() {
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.16, now + 6);
    master.connect(ctx.destination);
    this.master = master;

    const convolver = ctx.createConvolver();
    convolver.buffer = this.impulse(3.2, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    const dry = ctx.createGain();
    dry.gain.value = 0.75;
    convolver.connect(wet).connect(master);
    dry.connect(master);
    this.wet = wet;
    this.nodes.push(convolver, wet, dry);

    const bus = ctx.createGain();
    bus.connect(dry);
    bus.connect(convolver);
    this.nodes.push(bus);

    // --- drone -------------------------------------------------------------
    const drone = (freq: number, level: number, lfoRate: number) => {
      const g = ctx.createGain();
      g.gain.value = level;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 520;
      filter.Q.value = 0.7;
      const oscs = [
        { type: "sine" as OscillatorType, detune: 0, gain: 0.55 },
        { type: "triangle" as OscillatorType, detune: 4, gain: 0.25 },
        { type: "sawtooth" as OscillatorType, detune: -3, gain: 0.12 },
      ];
      oscs.forEach((o) => {
        const osc = ctx.createOscillator();
        osc.type = o.type;
        osc.frequency.value = freq;
        osc.detune.value = o.detune;
        const og = ctx.createGain();
        og.gain.value = o.gain;
        osc.connect(og).connect(filter);
        osc.start(now);
        this.nodes.push(osc, og);
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = lfoRate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = level * 0.35;
      lfo.connect(lfoGain).connect(g.gain);
      lfo.start(now);
      filter.connect(g).connect(bus);
      this.nodes.push(filter, g, lfo, lfoGain);
    };
    drone(SA_LO, 0.3, 0.05);
    drone(SA, 0.26, 0.07);
    drone(PA, 0.18, 0.09);
    drone(SA_HI, 0.1, 0.11);

    // --- tanpura plucks ------------------------------------------------------
    const pattern = [PA, SA_HI, SA_HI, SA];
    let step = 0;
    const pluck = () => {
      const t = ctx.currentTime + 0.05;
      const f = pattern[step % pattern.length];
      step++;
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2400, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + 1.6);
      filter.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      osc.connect(filter).connect(g).connect(bus);
      osc.start(t);
      osc.stop(t + 3);
    };
    this.timers.push(window.setInterval(pluck, 1150));

    // --- soft bells ----------------------------------------------------------
    const bell = () => {
      if (Math.random() < 0.35) return;
      const t = ctx.currentTime + 0.05;
      const f = BELLS[Math.floor(Math.random() * BELLS.length)];
      const partials = [
        { ratio: 1, gain: 0.06, decay: 4.5 },
        { ratio: 2.76, gain: 0.018, decay: 2.2 },
        { ratio: 5.4, gain: 0.008, decay: 1.2 },
      ];
      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f * p.ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(p.gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);
        osc.connect(g).connect(convolver);
        osc.start(t);
        osc.stop(t + p.decay + 0.1);
      });
    };
    this.timers.push(window.setInterval(bell, 4200));

    // --- deep Om chant, every ~16s -----------------------------------------
    const om = () => {
      const t = ctx.currentTime + 0.1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 2.2);
      g.gain.setValueAtTime(0.14, t + 3.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 7.5);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(320, t);
      lp.frequency.exponentialRampToValueAtTime(520, t + 2.5);
      lp.frequency.exponentialRampToValueAtTime(220, t + 7);
      lp.Q.value = 1.2;
      // fundamental + octave + sub for the chest resonance of "Om"
      [
        { f: SA_LO, type: "sine" as OscillatorType, g: 0.5 },
        { f: SA, type: "sine" as OscillatorType, g: 1 },
        { f: SA, type: "triangle" as OscillatorType, g: 0.22 },
        { f: SA_HI, type: "sine" as OscillatorType, g: 0.18 },
      ].forEach((o) => {
        const osc = ctx.createOscillator();
        osc.type = o.type;
        osc.frequency.value = o.f;
        osc.detune.value = (Math.random() - 0.5) * 4;
        const og = ctx.createGain();
        og.gain.value = o.g;
        osc.connect(og).connect(lp);
        osc.start(t);
        osc.stop(t + 8);
      });
      lp.connect(g);
      g.connect(convolver);
      g.connect(dry);
    };
    window.setTimeout(om, 2500);
    this.timers.push(window.setInterval(om, 16000));
  }
}
