import { useEffect, useRef } from 'react';
import { GameState } from '../contracts/config';
import { useCurrentAccount } from '@mysten/dapp-kit';

export function useGoalAudio(gameState: GameState | null | undefined) {
  const currentAccount = useCurrentAccount();
  const previousScoreRef = useRef<{ player1Score: number; player2Score: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element
    if (!audioRef.current) {
      audioRef.current = new Audio('/siuu.mp3');
      audioRef.current.volume = 0.7; // Set volume to 70%
    }
  }, []);

  useEffect(() => {
    if (!gameState || !currentAccount?.address) {
      return;
    }

    // Skip if this is the first time we're seeing the game state
    if (!previousScoreRef.current) {
      previousScoreRef.current = {
        player1Score: gameState.player1Score,
        player2Score: gameState.player2Score,
      };
      return;
    }

    const previousScore = previousScoreRef.current;
    const currentScore = {
      player1Score: gameState.player1Score,
      player2Score: gameState.player2Score,
    };

    // Check if current user scored a goal
    const isPlayer1 = gameState.player1 === currentAccount.address;
    const isPlayer2 = gameState.player2 === currentAccount.address;

    let userScored = false;

    if (isPlayer1 && currentScore.player1Score > previousScore.player1Score) {
      userScored = true;
    } else if (isPlayer2 && currentScore.player2Score > previousScore.player2Score) {
      userScored = true;
    }

    // Play audio if user scored
    if (userScored && audioRef.current) {
      console.log('🥅 GOAL! Playing celebration audio...');
      audioRef.current.currentTime = 0; // Reset to beginning
      audioRef.current.play().catch((error) => {
        console.error('Failed to play goal audio:', error);
      });
    }

    // Update previous score reference
    previousScoreRef.current = currentScore;
  }, [gameState, currentAccount?.address]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
}