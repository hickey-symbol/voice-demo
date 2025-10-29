import { useAudioPlayer } from 'expo-audio';
import React from 'react';
import { Button, StyleSheet, View } from 'react-native';

type PlayerProps = {
  uri: string;
};

export default function Player({ uri }: PlayerProps) {
  const player = useAudioPlayer(uri);

  const handlePlay = async () => {
    if (player.playing) return; 
    player.play();
  }

  return (
    <View style={styles.container}>
      <Button title="播放录音" onPress={handlePlay} disabled={player.playing } />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  status: { marginLeft: 10 },
  playingText: { color: 'green', fontWeight: 'bold' },
  idleText: { color: '#666' },
});
