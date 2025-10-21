"use client";
import TIMELINE from "@/data/timeline";
import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";

export default function Home() {
  const getDefaultTimePoints = () => {
    const startTimes = ["0840", "1030", "1310", "1450", "1530", "1602"];
    const endTimes = ["1000", "1210", "1420", "1520", "1600", "1632"];

    return TIMELINE.map(item => ({
      time: item.time,
      description: item.description,
      label: item.short,
      visible: startTimes.includes(item.time) || endTimes.includes(item.time),
      audio: item.audio
    }));
  };

  const [majorTimePoints, setMajorTimePoints] = useState(getDefaultTimePoints());

  const getTimeRangeInSeconds = useCallback(() => {
    if (majorTimePoints.length === 0) {
      return { startSeconds: 29100, durationSeconds: 30720, startHour: 8, startMinute: 5 };
    }

    const sortedTimes = [...majorTimePoints].sort((a, b) => a.time.localeCompare(b.time));
    const firstTime = sortedTimes[0].time;
    const lastTime = sortedTimes[sortedTimes.length - 1].time;

    const startHour = Number(firstTime.substring(0, 2));
    const startMinute = Number(firstTime.substring(2, 4));
    const endHour = Number(lastTime.substring(0, 2));
    const endMinute = Number(lastTime.substring(2, 4));

    const startSeconds = startHour * 3600 + startMinute * 60;
    const endSeconds = endHour * 3600 + endMinute * 60;
    const durationSeconds = endSeconds - startSeconds;

    return { startSeconds, durationSeconds, startHour, startMinute };
  }, [majorTimePoints]);

  const getInitialSeconds = useCallback(() => {
    const now = dayjs();

    if (majorTimePoints.length === 0) {
      return -1;
    }

    const sortedTimes = [...majorTimePoints].sort((a, b) => a.time.localeCompare(b.time));
    const firstTime = sortedTimes[0].time;
    const lastTime = sortedTimes[sortedTimes.length - 1].time;

    const startHour = Number(firstTime.substring(0, 2));
    const startMinute = Number(firstTime.substring(2, 4));
    const endHour = Number(lastTime.substring(0, 2));
    const endMinute = Number(lastTime.substring(2, 4));

    const startTime = dayjs().startOf('day').hour(startHour).minute(startMinute).second(0);
    const endTime = dayjs().startOf('day').hour(endHour).minute(endMinute).second(0);

    if (now.isBefore(startTime)) {
      // 시작 전: -1을 특수값으로 사용 (실제 시계 모드)
      return -1;
    } else if (now.isAfter(startTime) && now.isBefore(endTime)) {
      // 진행 중: 경과 시간 반환
      return now.diff(startTime, 'second');
    } else {
      // 종료 후: 다시 시작 전 모드로
      return -1;
    }
  }, [majorTimePoints]);

  const [audio, setAudio] = useState<HTMLAudioElement>();
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [seconds, setSeconds] = useState(0);
  const [doneTimes, setDoneTimes] = useState<Set<string>>(new Set());
  const [currentTimename, setCurrentTimename] = useState("1교시 입실준비");
  const [active, setActive] = useState(false);
  const [showStartPrompt, setShowStartPrompt] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [clockVisible, setClockVisible] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [useRealTime, setUseRealTime] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isRealClockMode, setIsRealClockMode] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setDarkMode(savedDarkMode === 'true');
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', String(newValue));
      return newValue;
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('timePoints');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // audio 필드가 없는 경우 TIMELINE에서 찾아서 채우기
        const updated = parsed.map((point: any) => {
          if (point.audio === undefined) {
            const timelineItem = TIMELINE.find(t => t.time === point.time);
            return { ...point, audio: timelineItem?.audio || null };
          }
          return point;
        });
        setMajorTimePoints(updated);
      } catch (e) {
        console.error('Failed to load saved time points:', e);
      }
    }
  }, []);

  const saveTimePoints = (points: typeof majorTimePoints) => {
    setMajorTimePoints(points);
    localStorage.setItem('timePoints', JSON.stringify(points));
  };

  const downloadConfig = () => {
    const config = {
      version: "1.0",
      timePoints: majorTimePoints,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csat-timeline-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        if (config.timePoints && Array.isArray(config.timePoints)) {
          saveTimePoints(config.timePoints);
          alert('설정을 불러왔습니다!');
        } else {
          alert('올바르지 않은 파일 형식입니다.');
        }
      } catch (error) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const addTimePoint = () => {
    const newPoint = { time: "0900", description: "새 시간대", label: "새 시간", visible: true, audio: null };
    saveTimePoints([...majorTimePoints, newPoint]);
  };

  const deleteTimePoint = (index: number) => {
    const newPoints = majorTimePoints.filter((_, i) => i !== index);
    saveTimePoints(newPoints);
  };

  const updateTimePoint = (index: number, field: 'time' | 'description' | 'label' | 'visible' | 'audio', value: string | boolean | null) => {
    const newPoints = [...majorTimePoints];
    newPoints[index] = { ...newPoints[index], [field]: value };
    saveTimePoints(newPoints);
  };

  const resetToDefault = () => {
    if (confirm('기본 설정으로 초기화하시겠습니까?')) {
      saveTimePoints(getDefaultTimePoints());
    }
  };

  useEffect(() => {
    if (useRealTime) {
      const initialSeconds = getInitialSeconds();

      if (initialSeconds === -1) {
        // 시작 전 또는 종료 후: 실제 시계 모드
        setIsRealClockMode(true);
        setSeconds(0);
        setCurrentTimename("시험 시작 전");
        setDoneTimes(new Set());
      } else {
        // 진행 중: 경과 시간부터 시작
        setIsRealClockMode(false);
        setSeconds(initialSeconds);

        let initialTimename = majorTimePoints[0]?.description || "입실준비";
        const initialDoneTimes = new Set<string>();
        const { startSeconds } = getTimeRangeInSeconds();

        majorTimePoints.forEach((one) => {
          const oneHours = Number(one.time.substring(0, 2));
          const oneMinutes = Number(one.time.substring(2, 4));
          const oneTotalSeconds = oneHours * 60 * 60 + oneMinutes * 60 - startSeconds;

          if (oneTotalSeconds <= initialSeconds) {
            initialDoneTimes.add(one.time);
            initialTimename = one.description || one.label;
          }
        });

        setCurrentTimename(initialTimename);
        setDoneTimes(initialDoneTimes);
      }
    } else {
      // 실시간 모드 해제: 처음으로 초기화
      setIsRealClockMode(false);
      setSeconds(0);
      setDoneTimes(new Set());
      setCurrentTimename(majorTimePoints[0]?.description || "1교시 입실준비");
    }
  }, [useRealTime, majorTimePoints, getInitialSeconds, getTimeRangeInSeconds]);

  useEffect(() => {
    const handleInteraction = () => {
      setShowStartPrompt(false);
      if (audioContext?.state === 'suspended') {
        audioContext.resume();
      }
      if (!active) {
        setActive(true);
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    const timer = setTimeout(() => {
      setActive(true);
      setShowStartPrompt(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [active, audioContext]);

  const jumpToTime = (targetTime: string) => {
    const { startSeconds } = getTimeRangeInSeconds();
    const targetHours = Number(targetTime.substring(0, 2));
    const targetMinutes = Number(targetTime.substring(2, 4));
    const targetSeconds = targetHours * 60 * 60 + targetMinutes * 60 - startSeconds;

    setSeconds(targetSeconds);
    setDoneTimes(new Set());

    let newTimename = majorTimePoints[0]?.description || "입실준비";
    const newDoneTimes = new Set<string>();
    majorTimePoints.forEach((one) => {
      const oneHours = Number(one.time.substring(0, 2));
      const oneMinutes = Number(one.time.substring(2, 4));
      const oneTotalSeconds = oneHours * 60 * 60 + oneMinutes * 60 - startSeconds;
      if (oneTotalSeconds <= targetSeconds) {
        newDoneTimes.add(one.time);
        newTimename = one.description || one.label;
      }
    });
    setCurrentTimename(newTimename);
    setDoneTimes(newDoneTimes);

    // 해당 시간의 소리 재생
    const timePoint = majorTimePoints.find((one) => one.time === targetTime);
    if (timePoint?.audio && soundEnabled && audio && audioContext) {
      audio.pause();
      const basePath = process.env.NODE_ENV === 'production' ? '/csat-simulator' : '';
      audio.src = basePath + timePoint.audio;
      audioContext.resume()
        .then(() => audio.play())
        .catch((err) => {
          console.warn('Audio playback failed:', err);
        });
    }
  };

  const findNearest5MinuteTime = (sliderValue: number) => {
    const { startSeconds, durationSeconds } = getTimeRangeInSeconds();
    const targetSeconds = (sliderValue / 100) * durationSeconds;
    const roundedSeconds = Math.round(targetSeconds / 300) * 300;
    const clampedSeconds = Math.max(0, Math.min(durationSeconds, roundedSeconds));
    const totalSeconds = clampedSeconds + startSeconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const timeString = `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;
    return timeString;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = Number(e.target.value);
    const nearestTime = findNearest5MinuteTime(sliderValue);
    jumpToTime(nearestTime);
  };

  const toggleRealTime = useCallback(() => {
    setUseRealTime(prev => !prev);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        setSoundEnabled(prev => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        setClockVisible(prev => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        setShowControls(prev => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        toggleRealTime();
      } else if (e.key === 'd' || e.key === 'D') {
        toggleDarkMode();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [toggleDarkMode, toggleRealTime]);

  useEffect(() => {
    let audio = new Audio();
    let audioContext = new AudioContext();

    const sourceNode = audioContext.createMediaElementSource(audio);

    const reverbMix = 0.8;
    const reverbTime = 0.25;
    const reverbDecay = 0.1;

    const delayMix = 0.7;
    const delayFeedback = 0.6;
    const delayTime = 0.001;

    const inputNode = audioContext.createGain();
    const reverbWetGainNode = audioContext.createGain();
    const reverbDryGainNode = audioContext.createGain();
    const reverbNode = audioContext.createConvolver();

    const delayWetGainNode = audioContext.createGain();
    const delayDryGainNode = audioContext.createGain();
    const delayFeedbackNode = audioContext.createGain();
    const delayNode = audioContext.createDelay(delayTime);

    const outputNode = audioContext.createGain();

    sourceNode.connect(inputNode);

    inputNode.connect(delayDryGainNode);
    delayDryGainNode.connect(outputNode);
    delayDryGainNode.gain.value = 1 - delayMix;

    delayNode.connect(delayFeedbackNode);
    delayFeedbackNode.connect(delayNode);
    delayFeedbackNode.gain.value = delayFeedback;

    inputNode.connect(delayNode);
    delayNode.connect(delayWetGainNode);
    delayWetGainNode.connect(outputNode);
    delayWetGainNode.gain.value = delayMix;

    delayWetGainNode.connect(reverbDryGainNode);
    reverbDryGainNode.connect(outputNode);
    reverbDryGainNode.gain.value = 1 - reverbMix;

    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * reverbTime;
    const impulse = audioContext.createBuffer(2, length, sampleRate);

    const leftImpulse = impulse.getChannelData(0);
    const rightImpulse = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      leftImpulse[i] =
        (Math.random() * 2 - 1) * Math.pow(1 - i / length, reverbDecay);
      rightImpulse[i] =
        (Math.random() * 2 - 1) * Math.pow(1 - i / length, reverbDecay);
    }

    reverbNode.buffer = impulse;

    delayWetGainNode.connect(reverbNode);
    reverbNode.connect(reverbWetGainNode);
    reverbWetGainNode.connect(outputNode);
    reverbWetGainNode.gain.value = reverbMix;

    const threshold = -12;
    const attack = 0.003;
    const release = 0.25;
    const ratio = 12;
    const knee = 30;

    const compressorNode = audioContext.createDynamicsCompressor();
    compressorNode.threshold.setValueAtTime(
      threshold,
      audioContext.currentTime
    );
    compressorNode.attack.setValueAtTime(attack, audioContext.currentTime);
    compressorNode.release.setValueAtTime(release, audioContext.currentTime);
    compressorNode.ratio.setValueAtTime(ratio, audioContext.currentTime);
    compressorNode.knee.setValueAtTime(knee, audioContext.currentTime);

    reverbWetGainNode.connect(compressorNode);

    compressorNode.connect(outputNode);

    outputNode.connect(audioContext.destination);

    setAudio(audio);
    setAudioContext(audioContext);
  }, []);

  // 실시간 모드에서 시작 시간 체크 및 자동 전환
  useEffect(() => {
    if (useRealTime && isRealClockMode && majorTimePoints.length > 0) {
      const checkInterval = setInterval(() => {
        const now = dayjs();

        const sortedTimes = [...majorTimePoints].sort((a, b) => a.time.localeCompare(b.time));
        const firstTime = sortedTimes[0].time;
        const startHour = Number(firstTime.substring(0, 2));
        const startMinute = Number(firstTime.substring(2, 4));
        const startTime = dayjs().startOf('day').hour(startHour).minute(startMinute).second(0);

        if (now.isAfter(startTime) || now.isSame(startTime)) {
          // 시작 시간이 되면 실제 시뮬레이터 모드로 전환
          setIsRealClockMode(false);
          setSeconds(0);
          setCurrentTimename(majorTimePoints[0]?.description || "입실준비");
          setDoneTimes(new Set());
        }
      }, 1000);

      return () => clearInterval(checkInterval);
    }
  }, [useRealTime, isRealClockMode, majorTimePoints]);

  useEffect(() => {
    if (active && !isRealClockMode) {
      let timer = setInterval(() => {
        setSeconds((prev) => {
          return prev + 1;
        });
      }, 1000);

      let interval = setInterval(() => {
        const { startHour, startMinute, startSeconds } = getTimeRangeInSeconds();
        let current = dayjs()
          .startOf("day")
          .set("hour", startHour)
          .set("minute", startMinute)
          .set("second", 0)
          .add(seconds, "seconds");

        let currentHourMin = current.format("HHmm");

        let newDoneTimes = new Set(doneTimes);

        let newCurrentTimename = "";

        majorTimePoints.forEach((one) => {
          let oneHours = Number(one.time.substring(0, 2));
          let oneMinutes = Number(one.time.substring(2, 4));

          let oneTotalSeconds = oneHours * 60 * 60 + oneMinutes * 60 - startSeconds;

          if (oneTotalSeconds < seconds) {
            newDoneTimes.add(one.time);
            newCurrentTimename = one.description || one.label;
          }
        });

        if (!newDoneTimes.has(currentHourMin)) {
          let source = majorTimePoints.find(
            (one) => one.time === currentHourMin
          );
          let audioSource = TIMELINE.find(
            (one) => one.time === currentHourMin
          );

          if (audioSource?.audio && soundEnabled && current.second() === 0) {
            audio!.pause();
            const basePath = process.env.NODE_ENV === 'production' ? '/csat-simulator' : '';
            audio!.src = basePath + audioSource.audio;
            audioContext?.resume()
              .then(() => audio!.play())
              .catch((err) => {
                console.warn('Audio playback failed:', err);
              });
          }

          if (source && current.second() === 0) {
            newDoneTimes.add(current.format("HHmm"));
            setDoneTimes(newDoneTimes);
            newCurrentTimename = source.description || source.label;
          }
        }

        setCurrentTimename(newCurrentTimename);
      }, 100);

      return () => {
        clearInterval(timer);
        clearInterval(interval);
      };
    }
  }, [active, audio, audioContext, doneTimes, seconds, soundEnabled, majorTimePoints, isRealClockMode, getTimeRangeInSeconds]);

  const { startHour, startMinute } = getTimeRangeInSeconds();
  let current = isRealClockMode
    ? dayjs() // 실시간 시계 모드
    : dayjs()
        .startOf("day")
        .set("hour", startHour)
        .set("minute", startMinute)
        .set("second", 0)
        .add(seconds, "seconds");

  return (
    <main className={`w-full h-screen flex flex-col items-center justify-center relative transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    }`}>
      {showStartPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-pulse">
          <div className={`rounded-3xl p-12 shadow-2xl text-center ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`text-3xl font-bold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              화면을 클릭하여 시작하세요
            </div>
            <div className={`text-xl ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Click anywhere to start
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-4 right-4 flex gap-2 z-40">
        <button
          onClick={() => setShowControls(!showControls)}
          className={`backdrop-blur-sm rounded-full p-3 shadow-lg transition-all ${
            darkMode 
              ? 'bg-gray-700/80 hover:bg-gray-700 text-white' 
              : 'bg-white/80 hover:bg-white text-gray-800'
          }`}
          title="메뉴 (M)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {showControls && (
        <div className={`fixed top-20 right-4 backdrop-blur-sm rounded-2xl p-6 shadow-2xl z-40 min-w-[280px] max-h-[80vh] overflow-y-auto ${
          darkMode ? 'bg-gray-800/95' : 'bg-white/95'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>다크 모드</span>
        <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
        </button>
      </div>

            <div className="flex items-center justify-between">
              <span className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>소리 재생</span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>시계 표시</span>
              <button
                onClick={() => setClockVisible(!clockVisible)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  clockVisible ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    clockVisible ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>시간대 설정</div>
              <div className="space-y-2">
                <button
                  onClick={() => setShowEditor(!showEditor)}
                  className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {showEditor ? '편집 닫기' : '시간대 편집'}
                </button>
                
                <div className="flex gap-2">
            <button
                    onClick={downloadConfig}
                    className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    다운로드
            </button>
                  <label className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer text-center">
                    업로드
                    <input
                      type="file"
                      accept=".txt"
                      onChange={uploadConfig}
                      className="hidden"
                    />
                  </label>
                </div>
                
            <button
                  onClick={resetToDefault}
                  className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  기본값으로 초기화
            </button>
              </div>
            </div>

            <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`text-sm space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <p><kbd className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>D</kbd> 다크 모드</p>
                <p><kbd className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>S</kbd> 소리 토글</p>
                <p><kbd className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>C</kbd> 시계 토글</p>
                <p><kbd className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>M</kbd> 메뉴 토글</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <div className={`fixed top-20 left-4 backdrop-blur-sm rounded-2xl p-6 shadow-2xl z-40 w-[500px] max-h-[80vh] overflow-y-auto ${
          darkMode ? 'bg-gray-800/95' : 'bg-white/95'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>시간대 편집</h3>
          <button
                onClick={() => setShowEditor(false)}
                className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {majorTimePoints.map((point, index) => (
                <div key={index} className={`flex gap-2 items-center p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        시간 & 화면 중앙 표시
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={point.time}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                            updateTimePoint(index, 'time', value);
                          }}
                          placeholder="0840"
                          className={`w-20 px-3 py-2 border rounded-lg text-sm font-mono ${
                            darkMode 
                              ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-800'
                          }`}
                          maxLength={4}
                        />
                        <input
                          type="text"
                          value={point.description || point.label}
                          onChange={(e) => updateTimePoint(index, 'description', e.target.value)}
                          placeholder="예: 1교시 국어"
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                            darkMode 
                              ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-800'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`visible-${index}`}
                        checked={point.visible ?? true}
                        onChange={(e) => updateTimePoint(index, 'visible', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label 
                        htmlFor={`visible-${index}`}
                        className={`text-sm font-medium cursor-pointer ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        슬라이더 스냅 포인트로 표시
                      </label>
                    </div>

                    <div>
                      <label className={`text-xs font-medium mb-1 block ${
                        (point.visible ?? true) 
                          ? (darkMode ? 'text-gray-400' : 'text-gray-600')
                          : (darkMode ? 'text-gray-600' : 'text-gray-400')
                      }`}>
                        슬라이더 하단 레이블 (짧게)
                      </label>
                      <input
                        type="text"
                        value={point.label}
                        onChange={(e) => updateTimePoint(index, 'label', e.target.value)}
                        placeholder="예: 국어"
                        disabled={!(point.visible ?? true)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          !(point.visible ?? true)
                            ? (darkMode 
                                ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed' 
                                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed')
                            : (darkMode 
                                ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-800')
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs font-medium mb-1 block ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        음원 선택
                      </label>
                      <select
                        value={point.audio || ''}
                        onChange={(e) => updateTimePoint(index, 'audio', e.target.value || null)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          darkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        <option value="">없음</option>
                        {TIMELINE.filter(t => t.audio).map((t) => (
                          <option key={t.time} value={t.audio!}>
                            {t.audio?.replace('/sounds/', '')} - {t.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTimePoint(index)}
                    className="flex-shrink-0 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addTimePoint}
              className="w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
            >
              + 시간대 추가
            </button>

            <div className={`text-xs mt-4 p-3 rounded-lg ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-gray-600'
            }`}>
              <p className="font-medium mb-2">💡 도움말</p>
              <p className="mb-1">• 시간은 4자리 숫자 (예: 0840)</p>
              <p className="mb-1">• 화면 중앙 표시: 큰 글씨로 나타나는 메인 텍스트</p>
              <p className="mb-1">• 슬라이더 레이블: 타임라인 하단의 짧은 표시</p>
              <p className="mb-1">• 음원 선택: 해당 시간에 재생될 소리 선택</p>
              <p className="mb-1">• 체크 해제하면 스냅 포인트에서 제외됩니다</p>
              <p>• 변경사항은 자동 저장됩니다</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center select-none w-full">
        {clockVisible && (
          <div className={`text-[120px] lg:text-[180px] font-bold leading-none mb-12 transition-all ${
            darkMode ? 'text-gray-100' : 'text-gray-800'
          }`}>
            {current.format("HH:mm:ss")}
          </div>
        )}
        
        <div className={`font-bold px-8 transition-all ${
          clockVisible ? 'text-5xl lg:text-7xl mb-8' : 'text-7xl lg:text-9xl'
        } ${
          darkMode ? 'text-blue-300' : 'text-indigo-900'
        }`}>
          {currentTimename}
        </div>

        <div className={`w-[90vw] max-w-5xl mx-auto transition-all ${clockVisible ? 'mt-0' : 'mt-12'}`}>
          {!useRealTime && (
            <div>
              <div className="relative py-4 flex items-center gap-3">
                <button
                  onClick={toggleRealTime}
                  className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all whitespace-nowrap"
                >
                  실시간
          </button>

                <div className="flex-1 relative h-2">
                  <div className={`absolute inset-0 rounded-full ${
                    darkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}>
                    {majorTimePoints.filter(p => p.visible !== false).map((point) => {
                      const { startSeconds, durationSeconds } = getTimeRangeInSeconds();
                      const pointHours = Number(point.time.substring(0, 2));
                      const pointMinutes = Number(point.time.substring(2, 4));
                      const pointSeconds = pointHours * 60 * 60 + pointMinutes * 60 - startSeconds;
                      const position = (pointSeconds / durationSeconds) * 100;
                      
                      return (
                        <div
                          key={point.time}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                          style={{ left: `${position}%` }}
                        >
                          <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                        </div>
                      );
                    })}
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={(seconds / getTimeRangeInSeconds().durationSeconds) * 100}
                    onChange={handleSliderChange}
                    className="absolute inset-0 w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:shadow-xl [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
                  />
        </div>
      </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 px-4 py-2 opacity-0 pointer-events-none text-sm font-medium whitespace-nowrap">
                  실시간
                </div>
                
                <div className="flex-1 relative h-12">
                  {majorTimePoints.filter(p => p.visible !== false).map((point) => {
                    const { startSeconds, durationSeconds } = getTimeRangeInSeconds();
                    const pointHours = Number(point.time.substring(0, 2));
                    const pointMinutes = Number(point.time.substring(2, 4));
                    const pointSeconds = pointHours * 60 * 60 + pointMinutes * 60 - startSeconds;
                    const position = (pointSeconds / durationSeconds) * 100;
                    
          return (
            <div
                        key={point.time}
                        className="absolute -translate-x-1/2 text-center cursor-pointer hover:scale-110 transition-transform"
                        style={{ left: `${position}%` }}
                        onClick={() => jumpToTime(point.time)}
                      >
                        <div className={`text-sm font-bold whitespace-nowrap ${
                          darkMode ? 'text-gray-100' : 'text-gray-800'
                        }`}>{point.label}</div>
                        <div className={`text-xs ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {point.time.substring(0, 2)}:{point.time.substring(2, 4)}
              </div>
            </div>
          );
        })}
      </div>
              </div>
            </div>
          )}
                    </div>
                    </div>

      <div className="fixed bottom-4 left-4 flex gap-2 z-40">
        {!soundEnabled && (
          <div className="bg-red-500/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
            🔇 소리 꺼짐
          </div>
        )}
        {!clockVisible && (
          <div className="bg-blue-500/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
            ⏰ 시계 숨김
                </div>
        )}
            </div>
    </main>
  );
}
