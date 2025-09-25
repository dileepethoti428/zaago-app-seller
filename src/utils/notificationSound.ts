/**
 * Utility for playing notification sounds across the application
 */

export type NotificationSoundType = 'order' | 'delivery' | 'payment' | 'system' | 'urgent' | 'success' | 'new_order_ringtone' | 'rapido_ringtone';

export type RingtoneType = 'rapido_ringtone';

export class NotificationSoundManager {
  private static instance: NotificationSoundManager;
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.7;
  private selectedRingtone: RingtoneType = 'rapido_ringtone';
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
    return ringtone === 'rapido_ringtone';
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
      if (type === 'new_order_ringtone' || type === 'rapido_ringtone') {
        console.log('🔊 Playing Rapido-style ringtone');
        this.playRapidoRingtone();
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

  private playRapidoRingtone() {
    if (!this.audioContext) {
      console.warn('🔊 No audio context for Rapido ringtone');
      return;
    }
    
    this.stopRingtone();
    
    const currentTime = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    this.currentRingtone = { oscillator, gainNode };
    
    // Rapido-style urgent ringtone pattern
    this.createRapidoPattern(oscillator, gainNode, currentTime);
    
    oscillator.start(currentTime);
    
    setTimeout(() => {
      this.stopRingtone();
    }, 10000);
  }
  
  private createRapidoPattern(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    // Rapido-style urgent pattern: Loud, attention-grabbing, repetitive
    const frequencies = [880, 1174, 880, 1174, 1318, 1046, 1318, 1046]; // High-pitched urgency
    const durations = [0.25, 0.25, 0.25, 0.25, 0.4, 0.3, 0.4, 0.3]; // Quick bursts
    
    let time = startTime;
    
    // Repeat the pattern 3 times for full effect
    for (let cycle = 0; cycle < 3; cycle++) {
      frequencies.forEach((freq, index) => {
        const duration = durations[index];
        oscillator.frequency.setValueAtTime(freq, time);
        gainNode.gain.setValueAtTime(this.volume * 0.95, time); // Very loud like Rapido
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.1, time + duration * 0.8);
        time += duration;
      });
      
      // Short pause between cycles
      gainNode.gain.setValueAtTime(0, time);
      time += 0.3;
    }
    
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
    this.playRapidoRingtone();
  }

  public playSpecificRingtone(ringtoneType: RingtoneType) {
    this.playRapidoRingtone();
  }
  public startContinuousRinging(type: NotificationSoundType = 'rapido_ringtone') {
    if (!this.continuousRingingEnabled || !this.isEnabled || !this.isTabVisible) {
      return;
    }

    console.log(`Starting continuous Rapido ringing for ${type}`);
    this.stopContinuousRinging();
    this.currentRepetitionCount = 0;

    this.playNotificationSound('rapido_ringtone');
    this.currentRepetitionCount++;

    this.currentRingingInterval = window.setInterval(() => {
      if (this.currentRepetitionCount >= this.maxRepetitions || !this.isTabVisible) {
        console.log('Auto-stopping continuous ringing - max repetitions reached or tab not visible');
        this.stopContinuousRinging();
        return;
      }

      console.log(`Playing Rapido ringtone repetition ${this.currentRepetitionCount + 1}`);
      this.playNotificationSound('rapido_ringtone');
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
      { value: 'rapido_ringtone' as const, label: 'Rapido Style (Loud & Urgent)' }
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
export const playNewOrderRingtone = () => notificationSound.playNotificationSound('rapido_ringtone');
export const playRapidoRingtone = () => notificationSound.playNotificationSound('rapido_ringtone');
export const stopRingtone = () => notificationSound.stopRingtone();
export const startContinuousRinging = () => notificationSound.startContinuousRinging();
export const stopContinuousRinging = () => notificationSound.stopContinuousRinging();