// AudioPlayer.tsx
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Create audio element
    const audio = new Audio('/stadium-immersive-sound.mp3');
    audio.loop = true; // Enable looping
    audio.volume = 0.3; // Set initial volume to 30%
    audioRef.current = audio;

    // Attempt to auto-play immediately
    audio.play()
      .then(() => {
        console.log('Stadium audio started playing automatically');
        setIsPlaying(true);
      })
      .catch(error => {
        console.log('Auto-play blocked by browser, will try on user interaction:', error);
        
        // Fallback: play on first user interaction if auto-play fails
        const handleUserInteraction = () => {
          if (audioRef.current) {
            audioRef.current.play()
              .then(() => {
                console.log('Stadium audio started playing after user interaction');
                setIsPlaying(true);
              })
              .catch(error => {
                console.error('Audio playback failed:', error);
              });
          }
        };

        // Add event listeners for user interaction as fallback
        document.addEventListener('click', handleUserInteraction, { once: true });
        document.addEventListener('touchstart', handleUserInteraction, { once: true });
        document.addEventListener('keydown', handleUserInteraction, { once: true });
      });

    return () => {
      // Clean up
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Handle mute/unmute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleManualPlay = () => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play()
        .then(() => {
          console.log('Manual stadium audio play successful');
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('Manual audio playback failed:', error);
        });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {!isPlaying && (
        <button 
          onClick={handleManualPlay}
          className="p-2 rounded-full bg-green-600/80 backdrop-blur-sm hover:bg-green-600 transition-colors"
          title="Play stadium sound"
        >
          <Play className="h-5 w-5 text-white" />
        </button>
      )}
      <button 
        onClick={toggleMute}
        className="p-2 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-colors"
        title={isMuted ? "Unmute stadium sound" : "Mute stadium sound"}
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5 text-white" />
        ) : (
          <Volume2 className="h-5 w-5 text-white" />
        )}
      </button>
    </div>
  );
}