/**
 * Utility for playing notification sounds across the application
 */

export type NotificationSoundType = 'order' | 'delivery' | 'payment' | 'system' | 'urgent' | 'success' | 'new_order_ringtone' | 'phone_ringtone' | 'classic_phone' | 'modern_phone' | 'bell_chime' | 'urgent_alert' | 'musical_tone' | 'traditional_ring';

export type RingtoneType = 'classic_phone' | 'modern_phone' | 'bell_chime' | 'urgent_alert' | 'musical_tone' | 'traditional_ring';

export class NotificationSoundManager {
  private static instance: NotificationSoundManager;
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.7; // Default to 70% volume
  private selectedRingtone: RingtoneType = 'classic_phone';
  private currentRingtone: { oscillator: OscillatorNode; gainNode: GainNode } | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    // Initialize audio context but don't create it until user interaction
    this.setupUserInteractionListeners();
    // Load saved preferences
    this.loadPreferences();
  }

  public static getInstance(): NotificationSoundManager {
    if (!NotificationSoundManager.instance) {
      NotificationSoundManager.instance = new NotificationSoundManager();
    }
    return NotificationSoundManager.instance;
  }

  private setupUserInteractionListeners() {
    // Add event listeners for user interaction to initialize audio context
    const initAudio = async () => {
      if (!this.isInitialized) {
        await this.initializeAudioContext();
        console.log('🔊 Audio context initialized after user interaction');
      }
    };

    // Listen for various user interactions
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
  }

  private async initializeAudioContext() {
    try {
      console.log('🔊 Initializing audio context...');
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if it's suspended (required for user interaction)
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
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
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

    // Ensure audio context is initialized
    await this.ensureAudioContext();

    if (!this.audioContext) {
      console.warn('🔊 No audio context available');
      return;
    }

    try {
      // Handle phone ringtone and new ringtone types
      if (type === 'phone_ringtone') {
        console.log('🔊 Playing phone ringtone');
        this.playPhoneRingtone();
        return;
      }

      // Handle new order notifications with selected ringtone
      if (type === 'new_order_ringtone') {
        console.log('🔊 Playing new order ringtone:', this.selectedRingtone);
        this.playSelectedRingtone();
        return;
      }

      // Handle specific ringtone types
      if (['classic_phone', 'modern_phone', 'bell_chime', 'urgent_alert', 'musical_tone', 'traditional_ring'].includes(type)) {
        console.log('🔊 Playing specific ringtone:', type);
        this.playSpecificRingtone(type as RingtoneType);
        return;
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Different sound patterns for different notification types
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
    
    // Two-tone chime: C5 -> G5
    oscillator.frequency.setValueAtTime(523.25, currentTime);
    oscillator.frequency.setValueAtTime(783.99, currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(this.volume * 0.5, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.4);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.4);
  }

  private playDeliverySound(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    // Success pattern: C5 -> E5 -> G5
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
    
    // Cash register sound: High -> Low
    oscillator.frequency.setValueAtTime(1000, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(this.volume * 0.3, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.3);
  }

  private playUrgentSound(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    // Urgent beep pattern: High frequency, repeated
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
    
    // Success chord: C -> E -> G
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
    
    // Simple notification: G5 -> C5 -> G5
    oscillator.frequency.setValueAtTime(783.99, currentTime);
    oscillator.frequency.setValueAtTime(523.25, currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(this.volume * 0.5, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.3);
  }

  private playNewOrderRingtone(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    // Phone ringtone pattern: Repeated melody like incoming call
    // Ring pattern: C5 -> E5 -> G5 -> C6, repeated 3 times with pauses
    const frequencies = [
      523.25, 659.25, 783.99, 1046.50, // First ring
      0, 0, // Pause
      523.25, 659.25, 783.99, 1046.50, // Second ring  
      0, 0, // Pause
      523.25, 659.25, 783.99, 1046.50  // Third ring
    ];
    
    const durations = [
      0.15, 0.15, 0.15, 0.3, // First ring
      0.2, 0.2, // Pause
      0.15, 0.15, 0.15, 0.3, // Second ring
      0.2, 0.2, // Pause  
      0.15, 0.15, 0.15, 0.3  // Third ring
    ];
    
    let timeOffset = 0;
    frequencies.forEach((freq, index) => {
      const duration = durations[index];
      if (freq > 0) {
        oscillator.frequency.setValueAtTime(freq, currentTime + timeOffset);
        gainNode.gain.setValueAtTime(this.volume * 0.6, currentTime + timeOffset);
        gainNode.gain.exponentialRampToValueAtTime(this.volume * 0.1, currentTime + timeOffset + duration * 0.8);
      } else {
        // Silence during pause
        gainNode.gain.setValueAtTime(0.01, currentTime + timeOffset);
      }
      timeOffset += duration;
    });
    
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + timeOffset);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + timeOffset);
  }

  private playPhoneRingtone() {
    if (!this.audioContext) {
      console.warn('🔊 No audio context for phone ringtone');
      return;
    }
    
    console.log('🔊 Starting phone ringtone, audio context state:', this.audioContext.state);
    
    // Stop any existing ringtone
    this.stopRingtone();
    
    const currentTime = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Store reference to stop later
    this.currentRingtone = { oscillator, gainNode };
    
    // Classic phone ringtone pattern - repeating ring with pauses
    this.createRingtonePattern(oscillator, gainNode, currentTime);
    
    oscillator.start(currentTime);
    
    // Auto-stop after 15 seconds (like a real phone call)
    setTimeout(() => {
      this.stopRingtone();
    }, 15000);
  }
  
  private createRingtonePattern(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    // Classic telephone ring: Two-tone with pause pattern
    const ringFreq1 = 440; // A4
    const ringFreq2 = 480; // Close to A#4
    
    let time = startTime;
    
    // Create repeating ring pattern for 15 seconds
    for (let cycle = 0; cycle < 8; cycle++) {
      // Ring 1: 0.4s on
      oscillator.frequency.setValueAtTime(ringFreq1, time);
      gainNode.gain.setValueAtTime(this.volume * 0.7, time);
      time += 0.2;
      
      oscillator.frequency.setValueAtTime(ringFreq2, time);
      time += 0.2;
      
      // Brief pause: 0.4s
      gainNode.gain.setValueAtTime(0, time);
      time += 0.4;
      
      // Ring 2: 0.4s on  
      gainNode.gain.setValueAtTime(this.volume * 0.7, time);
      oscillator.frequency.setValueAtTime(ringFreq1, time);
      time += 0.2;
      
      oscillator.frequency.setValueAtTime(ringFreq2, time);
      time += 0.2;
      
      // Long pause: 2s (like real phone)
      gainNode.gain.setValueAtTime(0, time);
      time += 2;
    }
    
    // Final fade out
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

    // Stop any existing ringtone
    this.stopRingtone();

    const currentTime = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Store reference to stop later
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
    
    // Auto-stop after 10 seconds
    setTimeout(() => {
      this.stopRingtone();
    }, 10000);
  }

  private createClassicPhoneRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    const ringFreq1 = 440; // A4
    const ringFreq2 = 480; // Close to A#4
    let time = startTime;
    
    for (let cycle = 0; cycle < 6; cycle++) {
      oscillator.frequency.setValueAtTime(ringFreq1, time);
      gainNode.gain.setValueAtTime(this.volume * 0.8, time);
      time += 0.2;
      
      oscillator.frequency.setValueAtTime(ringFreq2, time);
      time += 0.2;
      
      gainNode.gain.setValueAtTime(0, time);
      time += 0.4;
      
      gainNode.gain.setValueAtTime(this.volume * 0.8, time);
      oscillator.frequency.setValueAtTime(ringFreq1, time);
      time += 0.2;
      
      oscillator.frequency.setValueAtTime(ringFreq2, time);
      time += 0.2;
      
      gainNode.gain.setValueAtTime(0, time);
      time += 1.2;
    }
    
    gainNode.gain.setValueAtTime(0, time);
    oscillator.stop(time);
  }

  private createModernPhoneRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    let time = startTime;
    
    for (let cycle = 0; cycle < 4; cycle++) {
      frequencies.forEach((freq, index) => {
        oscillator.frequency.setValueAtTime(freq, time);
        gainNode.gain.setValueAtTime(this.volume * 0.7, time);
        time += 0.15;
        
        if (index < frequencies.length - 1) {
          gainNode.gain.setValueAtTime(this.volume * 0.3, time);
          time += 0.05;
        }
      });
      
      gainNode.gain.setValueAtTime(0, time);
      time += 1.5;
    }
    
    oscillator.stop(time);
  }

  private createBellChimeRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    const bellFreqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    let time = startTime;
    
    for (let cycle = 0; cycle < 5; cycle++) {
      bellFreqs.forEach(freq => {
        oscillator.frequency.setValueAtTime(freq, time);
        gainNode.gain.setValueAtTime(this.volume * 0.6, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.8);
        time += 0.3;
      });
      
      time += 0.8;
    }
    
    oscillator.stop(time);
  }

  private createUrgentAlertRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    let time = startTime;
    
    for (let cycle = 0; cycle < 8; cycle++) {
      // Fast alternating high-pitched beeps
      for (let beep = 0; beep < 6; beep++) {
        oscillator.frequency.setValueAtTime(1000, time);
        gainNode.gain.setValueAtTime(this.volume * 0.9, time);
        time += 0.1;
        
        gainNode.gain.setValueAtTime(0, time);
        time += 0.05;
        
        oscillator.frequency.setValueAtTime(1200, time);
        gainNode.gain.setValueAtTime(this.volume * 0.9, time);
        time += 0.1;
        
        gainNode.gain.setValueAtTime(0, time);
        time += 0.05;
      }
      
      time += 0.8;
    }
    
    oscillator.stop(time);
  }

  private createMusicalToneRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    // Musical melody: "Für Elise" opening notes
    const melody = [659.25, 622.25, 659.25, 622.25, 659.25, 493.88, 587.33, 523.25, 293.66]; // E5, D#5, E5, D#5, E5, B4, D5, C5, D4
    const durations = [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.4];
    let time = startTime;
    
    for (let cycle = 0; cycle < 3; cycle++) {
      melody.forEach((freq, index) => {
        oscillator.frequency.setValueAtTime(freq, time);
        gainNode.gain.setValueAtTime(this.volume * 0.6, time);
        time += durations[index];
        
        if (index < melody.length - 1) {
          gainNode.gain.setValueAtTime(this.volume * 0.1, time);
          time += 0.05;
        }
      });
      
      gainNode.gain.setValueAtTime(0, time);
      time += 1.0;
    }
    
    oscillator.stop(time);
  }

  private createTraditionalRingRingtone(oscillator: OscillatorNode, gainNode: GainNode, startTime: number) {
    // Old-style telephone ring with warbling effect
    let time = startTime;
    
    for (let cycle = 0; cycle < 5; cycle++) {
      // Create warbling effect with frequency modulation
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

  public getRingtoneOptions(): { value: RingtoneType; label: string }[] {
    return [
      { value: 'classic_phone', label: 'Classic Phone Ring' },
      { value: 'modern_phone', label: 'Modern Phone Ring' },
      { value: 'bell_chime', label: 'Bell Chime' },
      { value: 'urgent_alert', label: 'Urgent Alert' },
      { value: 'musical_tone', label: 'Musical Tone' },
      { value: 'traditional_ring', label: 'Traditional Ring' }
    ];
  }
}

// Export singleton instance
export const notificationSound = NotificationSoundManager.getInstance();

// Convenience functions
export const playOrderSound = () => notificationSound.playNotificationSound('order');
export const playDeliverySound = () => notificationSound.playNotificationSound('delivery');
export const playPaymentSound = () => notificationSound.playNotificationSound('payment');
export const playSystemSound = () => notificationSound.playNotificationSound('system');
export const playUrgentSound = () => notificationSound.playNotificationSound('urgent');
export const playSuccessSound = () => notificationSound.playNotificationSound('success');
export const playNewOrderRingtone = () => notificationSound.playNotificationSound('new_order_ringtone');
export const playPhoneRingtone = () => notificationSound.playNotificationSound('phone_ringtone');
export const stopRingtone = () => notificationSound.stopRingtone();