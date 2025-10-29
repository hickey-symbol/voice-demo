import Player from '@/components/ui/Player';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const OPENAI_API_KEY = "sk-xxxx"
export default function Page() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const pressStartTime = useRef<number>(0);

  useEffect(() => {
    // 设置音频模式，允许录音和静音模式播放
    (async () => {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  // 开始录音
  const startRecording = async () => {
    try {
      // 懒授权：直接请求权限，第一次点击会弹窗
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          '麦克风权限被拒绝',
          '请在系统设置中允许App访问麦克风',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '去设置',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      pressStartTime.current = Date.now();
    } catch (err: any) {
      Alert.alert('启动录音失败', err.message);
    }
  };

  // 停止录音
  const stopRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('未获取录音文件 URI');

      setRecordingUri(uri);

      // 长按至少 1 秒才上传
      const pressDuration = Date.now() - pressStartTime.current;
      if (pressDuration < 1000) {
        Alert.alert('录音时间太短', '请至少长按 1 秒录音');
        return;
      }

      setIsUploading(true);
      await uploadToOpenAI(uri);
    } catch (err: any) {
      console.log('err.message :>> ', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * 上传 OpenAI
   * @todo 未完成调试，只是获取了数据传输，不确定参数和结果是否正确
   */
  const uploadToOpenAI = async (uri: string) => {
    try {
      const responseFile = await fetch(uri);
      const blob = await responseFile.blob();
  
      const formData = new FormData();
      formData.append('file', blob, 'recording.m4a');
      formData.append('model', 'gpt-4o-transcribe');
  
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });
  
      const data = await response.json();
      setTranscript(data?.text ?? '无法识别音频');
    } catch (err: any) {
      console.log('err :>> ', err);
      Alert.alert('上传失败', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙️ OpenAI 语音识别 Demo</Text>

      <Pressable
        onPressIn={startRecording}
        onPressOut={stopRecording}
        style={({ pressed }) => [
          styles.recordButton,
          { backgroundColor: pressed ? 'red' : 'green' },
        ]}
      >
        <Text style={styles.recordText}>
          {recorderState.isRecording ? '松开停止并上传' : '长按录音'}
        </Text>
      </Pressable>

      {recordingUri && (
        <View style={{ marginTop: 20 }}>
          <Player uri={recordingUri} />
        </View>
      )}

      {isUploading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {transcript && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>识别结果：</Text>
          <Text>{transcript}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 30 },
  recordButton: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 50 },
  recordText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultBox: {
    marginTop: 30,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  resultTitle: { fontWeight: 'bold', marginBottom: 5 },
});
