/**
 * Utility for playing notification sounds across the application
 */

export type NotificationSoundType = 'order' | 'delivery' | 'payment' | 'system' | 'urgent' | 'success' | 'new_order_ringtone' | 'phone_ringtone' | 'classic_phone' | 'modern_phone' | 'bell_chime' | 'urgent_alert' | 'musical_tone' | 'traditional_ring';

export type RingtoneType = 'classic_phone' | 'modern_phone' | 'bell_chime' | 'urgent_alert' | 'musical_tone' | 'traditional_ring';

export class NotificationSoundManager {
  private static instance: NotificationSoundManager;
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.7;
  private selectedRingtone: RingtoneType = 'classic_phone';
  private currentRingtone: { oscillator: OscillatorNode; gainNode: GainNode } | null = null;
  private isInitialized: boolean = false;
  private continuousRingingEnabled: boolean = true;
  private maxRepetitions: number = 24;
  private currentRingingInterval: number | null = null;
  private currentRepetitionCount: number = 0;
  private isTabVisible: boolean = true;

  private constructor() {
    this.setupUserInteractionListeners();
    this.setupVisibilityTracking();
    this.loadPreferences();
  }

  public static getInstance(): NotificationSoundManager {
    if (!NotificationSoundManager.instance) {
      NotificationSoundManager.instance = new NotificationSoundManager();
    }
    return NotificationSoundManager.instance;
  }

  private setupUserInteractionListeners() {
    const initAudio = async () => {
      if (!this.isInitialized) {
        await this.initializeAudioContext();
        console.log('🔊 Audio context initialized after user interaction');
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
  }

  private setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = !document.hidden;
      if (!this.isTabVisible && this.currentRingingInterval) {
        this.stopContinuousRinging();
      }
    });
  }

  private async initializeAudioContext() {
    try {
      console.log('🔊 Initializing audio context...');
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        console.log('🔊 Resuming suspended audio context...');
        await this.audioContext.resume();
      }
      
      this.isInitialized = true;
      console.log('🔊 Audio context initialized successfully. State:', this.audioContext.state);
    } catch (error) {
      console.warn('🔊 Could not initialize audio context:', error);
    }
  }

  public async ensureAudioContext() {
    if (!this.isInitialized || !this.audioContext) {
      await this.initializeAudioContext();
    }
    
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('🔊 Audio context resumed');
      } catch (error) {
        console.warn('🔊 Failed to resume audio context:', error);
      }
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('notificationSoundEnabled', JSON.stringify(enabled));
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('notificationVolume', JSON.stringify(this.volume));
  }

  public getVolume(): number {
    return this.volume;
  }

  public setRingtone(ringtone: RingtoneType) {
    this.selectedRingtone = ringtone;
    localStorage.setItem('selectedRingtone', ringtone);
  }

  public getRingtone(): RingtoneType {
    return this.selectedRingtone;
  }

  private loadPreferences() {
    const savedVolume = localStorage.getItem('notificationVolume');
    if (savedVolume !== null) {
      this.volume = JSON.parse(savedVolume);
    }

    const savedRingtone = localStorage.getItem('selectedRingtone');
    if (savedRingtone && this.isValidRingtone(savedRingtone)) {
      this.selectedRingtone = savedRingtone as RingtoneType;
    }

    const savedEnabled = localStorage.getItem('notificationSoundEnabled');
    if (savedEnabled !== null) {
      this.isEnabled = JSON.parse(savedEnabled);
    }

    const savedContinuous = localStorage.getItem('continuousRingingEnabled');
    if (savedContinuous !== null) {
      this.continuousRingingEnabled = JSON.parse(savedContinuous);
    }

    const savedMaxReps = localStorage.getItem('maxRepetitions');
    if (savedMaxReps !== null) {
      this.maxRepetitions = parseInt(savedMaxReps);
    }
  }

  private isValidRingtone(ringtone: string): boolean {
    return ['classic_phone', 'modern_phone', 'bell_chime', 'urgent_alert', 'musical_tone', 'traditional_ring'].includes(ringtone);
  }

  public async playNotificationSound(type: NotificationSoundType = 'system') {
    console.log('🔊 Playing notification sound:', type);
    
    if (!this.isEnabled) {
      console.log('🔊 Notification sounds disabled');
      return;
    }

    await this.ensureAudioContext();

    if (!this.audioContext) {
      console.warn('🔊 No audio context available');
      return;
    }

    try {
      if (type === 'phone_ringtone') {
        console.log('🔊 Playing phone ringtone');
        this.playPhoneRingtone();
        return;
      }

      if (type === 'new_order_ringtone') {
        console.log('🔊 Playing new order ringtone:', this.selectedRingtone);
        this.playSelectedRingtone();
        return;
      }

      if (['classic_phone', 'modern_phone', 'bell_chime', 'urgent_alert', 'musical_tone', 'traditional_ring'].includes(type)) {
        console.log('🔊 Playing specific ringtone:', type);
        this.playSpecificRingtone(type as RingtoneType);
        return;
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      switch (type) {
        case 'order':
          this.playOrderSound(oscillator, gainNode);
          break;
        case 'delivery':
          this.playDeliverySound(oscillator, gainNode);
          break;
        case 'payment':
          this.playPaymentSound(oscillator, gainNode);
          break;
        case 'urgent':
          this.playUrgentSound(oscillator, gainNode);
          break;
        case 'success':
          this.playSuccessSound(oscillator, gainNode);
          break;
        default:
          this.playSystemSound(oscillator, gainNode);
      }

    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  private playOrderSound(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    oscillator.frequency.setValueAtTime(523.25, currentTime);
    oscillator.frequency.setValueAtTime(783.99, currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(this.volume * 0.5, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.4);
  }

  private playDeliverySound(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    oscillator.frequency.setValueAtTime(523.25, currentTime);
    oscillator.frequency.setValueAtTime(659.25, currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(this.volume * 0.4, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.5);
  }

  private playPaymentSound(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    oscillator.frequency.setValueAtTime(1000, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(this.volume * 0.3, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.3);
  }

  private playUrgentSound(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    oscillator.frequency.setValueAtTime(880, currentTime);
    oscillator.frequency.setValueAtTime(880, currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(this.volume * 0.6, currentTime);
    gainNode.gain.setValueAtTime(this.volume * 0.1, currentTime + 0.05);
    gainNode.gain.setValueAtTime(this.volume * 0.6, currentTime + 0.1);
    gainNode.gain.setValueAtTime(this.volume * 0.1, currentTime + 0.15);
    gainNode.gain.setValueAtTime(this.volume * 0.6, currentTime + 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.3);
  }

  private playSuccessSound(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    oscillator.frequency.setValueAtTime(261.63, currentTime);
    oscillator.frequency.setValueAtTime(329.63, currentTime + 0.08);
    oscillator.frequency.setValueAtTime(392.00, currentTime + 0.16);
    
    gainNode.gain.setValueAtTime(this.volume * 0.4, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.6);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.6);
  }

  private playSystemSound(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    oscillator.frequency.setValueAtTime(783.99, currentTime);
    oscillator.frequency.setValueAtTime(523.25, currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(this.volume * 0.5, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.3);
  }

  private playPhoneRingtone() {
    if (!this.audioContext) {
      console.warn('🔊 No audio context for phone ringtone');
      return;
    }
    
    this.stopRingtone();
    
    const currentTime = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    this.currentRingtone = { oscillator, gainNode };
    
    this.createRingtonePattern(oscillator, gainNode, currentTime);
    
    oscillator.start(currentTime);
    
    setTimeout(() => {
      this.stopRingtone();
    }, 15000);
  }
  
  private createRingtonePattern(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    const ringFreq1 = 440;
    const ringFreq2 = 480;
    
    let time = startTime;
    
    for (let cycle = 0; cycle < 8; cycle++) {
      oscillator.frequency.setValueAtTime(ringFreq1, time);
      gainNode.gain.setValueAtTime(this.volume * 0.7, time);
      time += 0.2;
      
      oscillator.frequency.setValueAtTime(ringFreq2, time);
      time += 0.2;
      
      gainNode.gain.setValueAtTime(0, time);
      time += 0.4;
      
      gainNode.gain.setValueAtTime(this.volume * 0.7, time);
      oscillator.frequency.setValueAtTime(ringFreq1, time);
      time += 0.2;
      
      oscillator.frequency.setValueAtTime(ringFreq2, time);
      time += 0.2;
      
      gainNode.gain.setValueAtTime(0, time);
      time += 2;
    }
    
    gainNode.gain.setValueAtTime(0, time);
    oscillator.stop(time);
  }
  
  public stopRingtone() {
    if (this.currentRingtone) {
      try {
        this.currentRingtone.gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
        this.currentRingtone.oscillator.stop();
      } catch (error) {
        // Oscillator might already be stopped
      }
      this.currentRingtone = null;
    }
  }

  public async playCustomFrequency(
    frequencies: number[],
    durations: number[],
    volume: number = 0.3
  ) {
    if (!this.isEnabled || !this.audioContext) {
      return;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      const currentTime = this.audioContext.currentTime;
      let timeOffset = 0;

      frequencies.forEach((freq, index) => {
        const duration = durations[index] || 0.1;
        oscillator.frequency.setValueAtTime(freq, currentTime + timeOffset);
        timeOffset += duration;
      });

      gainNode.gain.setValueAtTime(this.volume * volume, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + timeOffset);
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + timeOffset);
    } catch (error) {
      console.warn('Could not play custom notification sound:', error);
    }
  }

  private playSelectedRingtone() {
    this.playSpecificRingtone(this.selectedRingtone);
  }

  public playSpecificRingtone(ringtoneType: RingtoneType) {
    if (!this.audioContext || !this.isEnabled) {
      return;
    }

    this.stopRingtone();

    const currentTime = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    this.currentRingtone = { oscillator, gainNode };

    switch (ringtoneType) {
      case 'classic_phone':
        this.createClassicPhoneRingtone(oscillator, gainNode, currentTime);
        break;
      case 'modern_phone':
        this.createModernPhoneRingtone(oscillator, gainNode, currentTime);
        break;
      case 'bell_chime':
        this.createBellChimeRingtone(oscillator, gainNode, currentTime);
        break;
      case 'urgent_alert':
        this.createUrgentAlertRingtone(oscillator, gainNode, currentTime);
        break;
      case 'musical_tone':
        this.createMusicalToneRingtone(oscillator, gainNode, currentTime);
        break;
      case 'traditional_ring':
        this.createTraditionalRingRingtone(oscillator, gainNode, currentTime);
        break;
    }

    oscillator.start(currentTime);
    
    setTimeout(() => {
      this.stopRingtone();
    }, 10000);
  }

  private createClassicPhoneRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    // Enhanced classic phone ring - more prominent like Rapido
    const frequencies = [880, 1174, 880, 1174, 880, 1174, 1318, 1046];
    const durations = [300, 300, 300, 300, 300, 300, 600, 400];
    
    let time = startTime;
    frequencies.forEach((freq, index) => {
      const duration = durations[index] / 1000;
      oscillator.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(this.volume * 0.9, time);
      gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.1, time + duration * 0.8);
      time += duration;
    });
    
    oscillator.stop(time);
  }

  private createModernPhoneRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    let time = startTime;
    
    for (let cycle = 0; cycle < 4; cycle++) {
      const frequencies = [523, 659, 784, 1047];
      frequencies.forEach((freq) => {
        oscillator.frequency.setValueAtTime(freq, time);
        gainNode.gain.setValueAtTime(this.volume * 0.8, time);
        time += 0.1;
      });
      
      gainNode.gain.setValueAtTime(0, time);
      time += 0.3;
    }
    
    oscillator.stop(time);
  }

  private createBellChimeRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    let time = startTime;
    
    for (let cycle = 0; cycle < 3; cycle++) {
      oscillator.frequency.setValueAtTime(1047, time);
      gainNode.gain.setValueAtTime(this.volume * 0.8, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 1.0);
      time += 1.2;
    }
    
    oscillator.stop(time);
  }

  private createUrgentAlertRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    let time = startTime;
    
    for (let cycle = 0; cycle < 8; cycle++) {
      oscillator.frequency.setValueAtTime(1400, time);
      gainNode.gain.setValueAtTime(this.volume * 0.9, time);
      time += 0.15;
      
      gainNode.gain.setValueAtTime(0, time);
      time += 0.15;
    }
    
    oscillator.stop(time);
  }

  private createMusicalToneRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    const melody = [523, 587, 659, 698, 784, 880, 988, 1047];
    let time = startTime;
    
    for (let cycle = 0; cycle < 3; cycle++) {
      melody.forEach((freq) => {
        oscillator.frequency.setValueAtTime(freq, time);
        gainNode.gain.setValueAtTime(this.volume * 0.6, time);
        time += 0.2;
      });
      
      gainNode.gain.setValueAtTime(0, time);
      time += 1.0;
    }
    
    oscillator.stop(time);
  }

  private createTraditionalRingRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    let time = startTime;
    
    for (let cycle = 0; cycle < 5; cycle++) {
      const baseFreq = 400;
      for (let i = 0; i < 20; i++) {
        const warblingFreq = baseFreq + Math.sin(i * 0.5) * 50;
        oscillator.frequency.setValueAtTime(warblingFreq, time);
        gainNode.gain.setValueAtTime(this.volume * 0.7, time);
        time += 0.05;
      }
      
      gainNode.gain.setValueAtTime(0, time);
      time += 0.3;
      
      for (let i = 0; i < 20; i++) {
        const warblingFreq = baseFreq + Math.sin(i * 0.5) * 50;
        oscillator.frequency.setValueAtTime(warblingFreq, time);
        gainNode.gain.setValueAtTime(this.volume * 0.7, time);
        time += 0.05;
      }
      
      gainNode.gain.setValueAtTime(0, time);
      time += 1.5;
    }
    
    oscillator.stop(time);
  }

  public startContinuousRinging(type: NotificationSoundType = 'new_order_ringtone') {
    if (!this.continuousRingingEnabled || !this.isEnabled || !this.isTabVisible) {
      return;
    }

    console.log(`Starting continuous ringing for ${type}`);
    this.stopContinuousRinging();
    this.currentRepetitionCount = 0;

    this.playNotificationSound(type);
    this.currentRepetitionCount++;

    this.currentRingingInterval = window.setInterval(() => {
      if (this.currentRepetitionCount >= this.maxRepetitions || !this.isTabVisible) {
        console.log('Auto-stopping continuous ringing - max repetitions reached or tab not visible');
        this.stopContinuousRinging();
        return;
      }

      console.log(`Playing ringtone repetition ${this.currentRepetitionCount + 1}`);
      this.playNotificationSound(type);
      this.currentRepetitionCount++;
    }, 5000);
  }

  public stopContinuousRinging() {
    if (this.currentRingingInterval) {
      console.log('Stopping continuous ringing');
      clearInterval(this.currentRingingInterval);
      this.currentRingingInterval = null;
      this.currentRepetitionCount = 0;
    }
  }

  public setContinuousRingingEnabled(enabled: boolean) {
    this.continuousRingingEnabled = enabled;
    localStorage.setItem('continuousRingingEnabled', JSON.stringify(enabled));
    if (!enabled) {
      this.stopContinuousRinging();
    }
  }

  public setMaxRepetitions(repetitions: number) {
    this.maxRepetitions = Math.max(1, Math.min(48, repetitions));
    localStorage.setItem('maxRepetitions', this.maxRepetitions.toString());
  }

  public getContinuousRingingEnabled(): boolean {
    return this.continuousRingingEnabled;
  }

  public getMaxRepetitions(): number {
    return this.maxRepetitions;
  }

  public getRingtoneOptions() {
    return [
      { value: 'classic_phone' as const, label: 'Classic Phone' },
      { value: 'modern_phone' as const, label: 'Modern Phone' },
      { value: 'bell_chime' as const, label: 'Bell Chime' },
      { value: 'urgent_alert' as const, label: 'Urgent Alert' },
      { value: 'musical_tone' as const, label: 'Musical Tone' },
      { value: 'traditional_ring' as const, label: 'Traditional Ring' }
    ];
  }
}

export const notificationSound = NotificationSoundManager.getInstance();

export const playOrderSound = () => notificationSound.playNotificationSound('order');
export const playDeliverySound = () => notificationSound.playNotificationSound('delivery');
export const playPaymentSound = () => notificationSound.playNotificationSound('payment');
export const playSystemSound = () => notificationSound.playNotificationSound('system');
export const playUrgentSound = () => notificationSound.playNotificationSound('urgent');
export const playSuccessSound = () => notificationSound.playNotificationSound('success');
export const playNewOrderRingtone = () => notificationSound.playNotificationSound('new_order_ringtone');
export const playPhoneRingtone = () => notificationSound.playNotificationSound('phone_ringtone');
export const stopRingtone = () => notificationSound.stopRingtone();
export const startContinuousRinging = () => notificationSound.startContinuousRinging();
export const stopContinuousRinging = () => notificationSound.stopContinuousRinging();