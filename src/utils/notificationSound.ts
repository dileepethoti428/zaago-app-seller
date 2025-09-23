/**
 * Utility for playing notification sounds across the application
 */

export type NotificationSoundType = 'order' | 'delivery' | 'payment' | 'system' | 'urgent' | 'success' | 'new_order_ringtone' | 'phone_ringtone';

export class NotificationSoundManager {
  private static instance: NotificationSoundManager;
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private currentRingtone: { oscillator: OscillatorNode; gainNode: GainNode } | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    // Initialize audio context but don't create it until user interaction
    this.setupUserInteractionListeners();
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
      // Handle phone ringtone separately
      if (type === 'phone_ringtone') {
        console.log('🔊 Playing phone ringtone');
        this.playPhoneRingtone();
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
        case 'new_order_ringtone':
          this.playNewOrderRingtone(oscillator, gainNode);
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
    
    gainNode.gain.setValueAtTime(0.3, currentTime);
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
    
    gainNode.gain.setValueAtTime(0.25, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.5);
  }

  private playPaymentSound(oscillator: OscillatorNode, gainNode: GainNode) {
    const currentTime = this.audioContext!.currentTime;
    
    // Cash register sound: High -> Low
    oscillator.frequency.setValueAtTime(1000, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.2, currentTime);
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
    
    gainNode.gain.setValueAtTime(0.4, currentTime);
    gainNode.gain.setValueAtTime(0.1, currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.4, currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.4, currentTime + 0.2);
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
    
    gainNode.gain.setValueAtTime(0.25, currentTime);
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
    
    gainNode.gain.setValueAtTime(0.3, currentTime);
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
        gainNode.gain.setValueAtTime(0.4, currentTime + timeOffset);
        gainNode.gain.exponentialRampToValueAtTime(0.1, currentTime + timeOffset + duration * 0.8);
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
      gainNode.gain.setValueAtTime(0.5, time);
      time += 0.2;
      
      oscillator.frequency.setValueAtTime(ringFreq2, time);
      time += 0.2;
      
      // Brief pause: 0.4s
      gainNode.gain.setValueAtTime(0, time);
      time += 0.4;
      
      // Ring 2: 0.4s on  
      gainNode.gain.setValueAtTime(0.5, time);
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

      gainNode.gain.setValueAtTime(volume, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + timeOffset);
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + timeOffset);
    } catch (error) {
      console.warn('Could not play custom notification sound:', error);
    }
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