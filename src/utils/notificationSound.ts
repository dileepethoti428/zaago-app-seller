/**
 * Utility for playing notification sounds across the application
 */

export type NotificationSoundType = 'order' | 'delivery' | 'payment' | 'system' | 'urgent' | 'success' | 'new_order_ringtone' | 'rapido_ringtone';

export type RingtoneType = 'rapido_ringtone';

export class NotificationSoundManager {
  private static instance: NotificationSoundManager;
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.3; // Reduced default volume
  private selectedRingtone: RingtoneType = 'rapido_ringtone';
  private currentRingtone: { oscillator: OscillatorNode; gainNode: GainNode } | null = null;
  private isInitialized: boolean = false;
  private continuousRingingEnabled: boolean = true;
  private maxRepetitions: number = 24;
  private currentRingingInterval: number | null = null;
  private currentRepetitionCount: number = 0;
  private continuousRingingStartTime: number | null = null;
  private continuousRingingDuration: number = 40000; // 40 seconds total
  private isTabVisible: boolean = true;
  private lastUserInteraction: number = 0;
  private audioStatus: 'ready' | 'suspended' | 'blocked' | 'unavailable' = 'unavailable';
  private fallbackAudio: HTMLAudioElement | null = null;
  private hasVibrationSupport: boolean = false;
  private newOrderAudio: HTMLAudioElement | null = null;

  private constructor() {
    this.setupUserInteractionListeners();
    this.setupVisibilityTracking();
    this.loadPreferences();
    this.checkCapabilities();
    this.setupFallbackAudio();
  }

  public static getInstance(): NotificationSoundManager {
    if (!NotificationSoundManager.instance) {
      NotificationSoundManager.instance = new NotificationSoundManager();
    }
    return NotificationSoundManager.instance;
  }

  private setupUserInteractionListeners() {
    const trackInteraction = () => {
      this.lastUserInteraction = Date.now();
    };

    const initAudio = async () => {
      trackInteraction();
      if (!this.isInitialized) {
        await this.initializeAudioContext();
        console.log('🔊 Audio context initialized after user interaction');
      }
    };

    // Track all user interactions
    ['click', 'touchstart', 'keydown', 'scroll', 'mousedown'].forEach(event => {
      document.addEventListener(event, trackInteraction, { passive: true });
    });

    // Initialize audio on first interaction
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, initAudio, { once: true });
    });
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
      this.updateAudioStatus();
      console.log('🔊 Audio context initialized successfully. State:', this.audioContext.state);
    } catch (error) {
      console.warn('🔊 Could not initialize audio context:', error);
      this.audioStatus = 'unavailable';
    }
  }

  private updateAudioStatus() {
    if (!this.audioContext) {
      this.audioStatus = 'unavailable';
      return;
    }

    switch (this.audioContext.state) {
      case 'running':
        this.audioStatus = 'ready';
        break;
      case 'suspended':
        this.audioStatus = 'suspended';
        break;
      case 'closed':
        this.audioStatus = 'unavailable';
        break;
      default:
        this.audioStatus = 'blocked';
    }
  }

  private checkCapabilities() {
    // Check vibration support
    this.hasVibrationSupport = 'vibrate' in navigator;
    console.log('🔊 Vibration support:', this.hasVibrationSupport);
    console.log('🔊 User agent:', navigator.userAgent);
  }

  private setupFallbackAudio() {
    try {
      // Create fallback HTML5 audio for mobile browsers
      this.fallbackAudio = new Audio();
      this.fallbackAudio.preload = 'auto';
      this.fallbackAudio.volume = this.volume;
      
      // Create a simple beep sound data URL
      const beepDataURL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LKdSEGKHfH8N2QQAoUX7zuyKNRDwtOnu' + '...'; // truncated for brevity
      this.fallbackAudio.src = beepDataURL;

      // Setup new order ringtone audio
      this.newOrderAudio = new Audio('/audio/new-order-ringtone.mp3');
      this.newOrderAudio.preload = 'auto';
      this.newOrderAudio.volume = this.volume * 0.5; // Even lower volume for the ringtone
      this.newOrderAudio.loop = false;
    } catch (error) {
      console.warn('🔊 Could not create fallback audio:', error);
    }
  }

  public async ensureAudioContext() {
    if (!this.isInitialized || !this.audioContext) {
      await this.initializeAudioContext();
    }
    
    if (this.audioContext?.state === 'suspended') {
      try {
        console.log('🔊 Attempting to resume suspended audio context');
        await this.audioContext.resume();
        this.updateAudioStatus();
        console.log('🔊 Audio context resumed successfully');
      } catch (error) {
        console.warn('🔊 Failed to resume audio context:', error);
        this.audioStatus = 'blocked';
        
        // Try to create a new context if resume failed
        try {
          console.log('🔊 Creating new audio context after resume failure');
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          this.isInitialized = true;
          this.updateAudioStatus();
        } catch (newError) {
          console.error('🔊 Could not create new audio context:', newError);
        }
      }
    } else {
      this.updateAudioStatus();
    }
  }

  public getAudioStatus(): { status: string; canPlay: boolean; message: string; isContinuousRinging: boolean; remainingTime?: number } {
    const recentInteraction = Date.now() - this.lastUserInteraction < 5000;
    const remainingTime = this.continuousRingingStartTime 
      ? Math.max(0, this.continuousRingingDuration - (Date.now() - this.continuousRingingStartTime))
      : undefined;
    
    switch (this.audioStatus) {
      case 'ready':
        return { 
          status: 'ready', 
          canPlay: true, 
          message: 'Audio is ready and working',
          isContinuousRinging: this.currentRingingInterval !== null,
          remainingTime
        };
      case 'suspended':
        return { 
          status: 'suspended', 
          canPlay: recentInteraction, 
          message: recentInteraction ? 'Audio will work after interaction' : 'Please interact with the page to enable audio',
          isContinuousRinging: this.currentRingingInterval !== null,
          remainingTime
        };
      case 'blocked':
        return { 
          status: 'blocked', 
          canPlay: false, 
          message: 'Audio is blocked by browser. Please enable audio in browser settings.',
          isContinuousRinging: this.currentRingingInterval !== null,
          remainingTime
        };
      default:
        return { 
          status: 'unavailable', 
          canPlay: false, 
          message: 'Audio is not available on this device',
          isContinuousRinging: this.currentRingingInterval !== null,
          remainingTime
        };
    }
  }

  private async playFallbackSound() {
    // Try HTML5 audio fallback
    if (this.fallbackAudio) {
      try {
        this.fallbackAudio.volume = this.volume;
        await this.fallbackAudio.play();
        console.log('🔊 Played fallback audio');
        return true;
      } catch (error) {
        console.warn('🔊 Fallback audio failed:', error);
      }
    }

    // Try vibration if available
    if (this.hasVibrationSupport) {
      try {
        navigator.vibrate([200, 100, 200, 100, 200]);
        console.log('🔊 Used vibration fallback');
        return true;
      } catch (error) {
        console.warn('🔊 Vibration failed:', error);
      }
    }

    return false;
  }

  private showAudioPermissionPrompt() {
    // Show user-friendly prompt to enable audio
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        new Notification('Audio Permission Required', {
          body: 'Please enable audio to receive order notifications',
          icon: '/zaago-logo.png'
        });
      } catch (error) {
        console.warn('🔊 Could not show notification:', error);
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
    
    // Update audio volumes
    if (this.fallbackAudio) {
      this.fallbackAudio.volume = this.volume;
    }
    if (this.newOrderAudio) {
      this.newOrderAudio.volume = this.volume * 0.5; // Keep ringtone volume lower
    }
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
    console.log('🔊 Playing notification sound:', type, 'Audio status:', this.audioStatus);
    
    if (!this.isEnabled) {
      console.log('🔊 Notification sounds disabled');
      return;
    }

    // Force audio context initialization for urgent sounds
    if (type === 'new_order_ringtone' || type === 'rapido_ringtone') {
      console.log('🔊 URGENT: Force initializing audio for new order');
      
      let success = false;
      
      // Try multiple approaches for urgent notifications
      try {
        await this.ensureAudioContext();
        await this.playNewOrderRingtone();
        success = true;
        console.log('🔊 SUCCESS: Custom ringtone played');
      } catch (error) {
        console.warn('🔊 Custom ringtone failed:', error);
      }
      
      // If custom audio failed, try fallback immediately
      if (!success) {
        console.log('🔊 Trying fallback audio for urgent notification');
        success = await this.playFallbackSound();
      }
      
      // If all audio fails, at least try vibration
      if (!success && this.hasVibrationSupport) {
        console.log('🔊 All audio failed, using vibration');
        try {
          navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
        } catch (e) {
          console.warn('🔊 Vibration also failed:', e);
        }
      }
      
      return;
    }

    await this.ensureAudioContext();

    // Check if we can play audio
    const audioStatus = this.getAudioStatus();
    console.log('🔊 Audio status check:', audioStatus);

    if (!audioStatus.canPlay) {
      console.warn('🔊 Cannot play audio, trying fallbacks');
      await this.playFallbackSound();
      return;
    }

    if (!this.audioContext) {
      console.warn('🔊 No audio context available, trying fallback');
      await this.playFallbackSound();
      return;
    }

    try {

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
      console.warn('🔊 Could not play notification sound, trying fallback:', error);
      await this.playFallbackSound();
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

  private async playNewOrderRingtone() {
    console.log('🔊 Playing new order ringtone');
    
    this.stopRingtone();
    
    if (this.newOrderAudio) {
      try {
        this.newOrderAudio.currentTime = 0;
        this.newOrderAudio.volume = Math.min(this.volume * 1.5, 0.8); // Increase volume for urgency
        
        // Ensure the audio is loaded
        if (this.newOrderAudio.readyState < 2) {
          console.log('🔊 Audio not ready, loading...');
          await new Promise((resolve) => {
            this.newOrderAudio!.addEventListener('canplay', resolve, { once: true });
            this.newOrderAudio!.load();
          });
        }
        
        console.log('🔊 Starting audio playback...');
        const playPromise = this.newOrderAudio.play();
        console.log('🔊 Playing custom ringtone');
        return;
      } catch (error) {
        console.warn('🔊 Could not play custom ringtone, falling back:', error);
      }
    }
    
    // Fallback to synthetic ringtone if MP3 fails
    this.playRapidoRingtone();
  }

  private playRapidoRingtone() {
    if (!this.audioContext) {
      console.warn('🔊 No audio context for Rapido ringtone');
      return;
    }
    
    console.log('🔊 Playing Rapido ringtone, audio context state:', this.audioContext.state);
    
    this.stopRingtone();
    
    const currentTime = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    this.currentRingtone = { oscillator, gainNode };
    
    // Start the oscillator first, then create the pattern
    oscillator.start(currentTime);
    
    // Rapido-style urgent pattern: Loud, attention-grabbing, repetitive
    this.createRapidoPattern(oscillator, gainNode, currentTime);
    
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
        gainNode.gain.exponentialRampToValueAtTime(Math.max(0.01, this.volume * 0.1), time + duration * 0.8);
        time += duration;
      });
      
      // Short pause between cycles
      gainNode.gain.setValueAtTime(0.01, time);
      time += 0.3;
    }
    
    // Schedule the oscillator to stop at the calculated end time
    oscillator.stop(time);
  }
  
  public stopRingtone() {
    // Stop custom MP3 ringtone
    if (this.newOrderAudio) {
      this.newOrderAudio.pause();
      this.newOrderAudio.currentTime = 0;
    }
    
    // Stop synthetic ringtone
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
    if (!this.continuousRingingEnabled || !this.isEnabled) {
      console.log('🔊 Continuous ringing blocked:', { 
        enabled: this.continuousRingingEnabled, 
        soundEnabled: this.isEnabled, 
        tabVisible: this.isTabVisible 
      });
      return;
    }

    console.log(`🔊 Starting continuous urgent ringing for ${type}`);
    this.stopContinuousRinging();
    this.currentRepetitionCount = 0;
    this.continuousRingingStartTime = Date.now();

    // Play immediately - force play
    this.playNotificationSound('rapido_ringtone');
    this.currentRepetitionCount++;

    this.currentRingingInterval = window.setInterval(() => {
      const elapsed = Date.now() - (this.continuousRingingStartTime || 0);
      
      if (this.currentRepetitionCount >= this.maxRepetitions || elapsed >= this.continuousRingingDuration) {
        console.log('🔊 Auto-stopping continuous ringing - max repetitions/time reached');
        this.stopContinuousRinging();
        return;
      }

      console.log(`🔊 Playing ringtone repetition ${this.currentRepetitionCount + 1}/${this.maxRepetitions}`);
      this.playNotificationSound('rapido_ringtone');
      this.currentRepetitionCount++;
    }, 3000); // Faster for urgency
  }

  public stopContinuousRinging() {
    if (this.currentRingingInterval) {
      console.log('Stopping continuous ringing');
      clearInterval(this.currentRingingInterval);
      this.currentRingingInterval = null;
      this.currentRepetitionCount = 0;
      this.continuousRingingStartTime = null;
    }
    // Also stop any currently playing ringtone
    this.stopRingtone();
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