import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Settings, X } from 'lucide-react';
import { SellerLocationSetup } from './SellerLocationSetup';
import { useNavigate } from 'react-router-dom';

interface LocationSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSet?: () => void;
}

export const LocationSetupModal = ({ open, onOpenChange, onLocationSet }: LocationSetupModalProps) => {
  const navigate = useNavigate();
  const [showLocationSetup, setShowLocationSetup] = useState(false);

  const handleLocationSaved = () => {
    setShowLocationSetup(false);
    onLocationSet?.();
    onOpenChange(false);
  };

  const goToSettings = () => {
    onOpenChange(false);
    navigate('/settings');
  };

  if (showLocationSetup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Set Your Store Location</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationSetup(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <SellerLocationSetup onLocationSaved={handleLocationSaved} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-yellow-500" />
            Location Required
          </DialogTitle>
          <DialogDescription className="text-left">
            You need to set your store location before you can mark orders as packed. 
            This helps delivery agents find your store.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <Button
            onClick={() => setShowLocationSetup(true)}
            className="w-full flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Set Location Now
          </Button>
          
          <Button
            onClick={goToSettings}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Go to Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};