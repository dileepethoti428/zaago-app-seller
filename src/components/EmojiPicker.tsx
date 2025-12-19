import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Smile } from 'lucide-react';

const EMOJI_LIST = [
  '🔥', '⭐', '💎', '🎉', '🛒', '🍎', '🥛', '🍞', '🥚', '🧀',
  '🍖', '🥩', '🍗', '🥬', '🥕', '🍅', '🌽', '🥔', '🧅', '🍌',
  '🍊', '🍇', '🍓', '🥭', '🍍', '🥥', '🍪', '🎂', '🍰', '🧁',
  '🍫', '🍬', '🍿', '☕', '🍵', '🥤', '🧃', '🍼', '💧', '🧊',
  '🏷️', '💰', '🎁', '✨', '❤️', '💚', '💙', '💜', '🧡', '💛',
  '🆕', '🔝', '💯', '🏆', '👑', '🌟', '⚡', '🌈', '🍀', '🌸',
];

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {value ? (
            <span className="text-xl mr-2">{value}</span>
          ) : (
            <Smile className="h-4 w-4 mr-2" />
          )}
          {value ? 'Change Icon' : 'Select Icon'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="grid grid-cols-10 gap-1">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelect(emoji)}
              className={`p-2 text-xl rounded hover:bg-accent transition-colors ${
                value === emoji ? 'bg-accent' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={handleClear}
          >
            Clear Icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
