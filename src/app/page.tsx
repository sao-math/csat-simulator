"use client";
import TIMELINE from "@/data/timeline";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

export default function Home() {
  // 현재 시간 기준으로 초기 seconds 계산
  const getInitialSeconds = () => {
    const now = dayjs();
    const startTime = dayjs().startOf('day').hour(8).minute(5).second(0);
    const endTime = dayjs().startOf('day').hour(16).minute(32).second(0);
    
    // 현재 시간이 수능 시간 범위 내에 있으면 경과 시간 계산
    if (now.isAfter(startTime) && now.isBefore(endTime)) {
      return now.diff(startTime, 'second');
    }
    
    // 수능 시간 전이거나 후면 0부터 시작
    return 0;
  };

  const [audio, setAudio] = useState<HTMLAudioElement>();
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [seconds, setSeconds] = useState(0); // SSR 호환을 위해 초기값은 0
  const [doneTimes, setDoneTimes] = useState<Set<string>>(new Set());
  const [currentTimename, setCurrentTimename] = useState(
    TIMELINE[0].description
  );
  const [active, setActive] = useState(false);
  const [showStartPrompt, setShowStartPrompt] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [clockVisible, setClockVisible] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [useRealTime, setUseRealTime] = useState(false);

  // 주요 시간대 정의 (과목 시작 시간)
  const majorTimePoints = [
    { time: "0805", label: "입실", emoji: "🚪" },
    { time: "0840", label: "국어", emoji: "📖" },
    { time: "1030", label: "수학", emoji: "🔢" },
    { time: "1310", label: "영어", emoji: "🗣️" },
    { time: "1450", label: "한국사", emoji: "📜" },
    { time: "1530", label: "탐구①", emoji: "🔬" },
    { time: "1602", label: "탐구②", emoji: "🧪" },
  ];

  // 초기 현재 과목명 설정 (클라이언트에서만 실행)
  useEffect(() => {
    if (useRealTime) {
      const initialSeconds = getInitialSeconds();
      setSeconds(initialSeconds); // 클라이언트에서 실제 시간으로 설정
      
      let initialTimename = TIMELINE[0].description;
      const initialDoneTimes = new Set<string>();

      TIMELINE.forEach((one) => {
        const oneHours = Number(one.time.substring(0, 2));
        const oneMinutes = Number(one.time.substring(2, 4));
        const oneTotalSeconds = oneHours * 60 * 60 + oneMinutes * 60 - 29100;

        if (oneTotalSeconds <= initialSeconds) {
          initialDoneTimes.add(one.time);
          initialTimename = one.description;
        }
      });

      setCurrentTimename(initialTimename);
      setDoneTimes(initialDoneTimes);
    }
  }, [useRealTime]);

  // 자동 시작 및 사용자 인터랙션 처리
  useEffect(() => {
    // 페이지 클릭 시 오디오 컨텍스트 활성화
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

    // 자동 시작 시도 (브라우저가 허용하면 자동 시작)
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

  // 특정 시간으로 점프
  const jumpToTime = (targetTime: string) => {
    const targetHours = Number(targetTime.substring(0, 2));
    const targetMinutes = Number(targetTime.substring(2, 4));
    const targetSeconds = targetHours * 60 * 60 + targetMinutes * 60 - 29100;
    
    setSeconds(targetSeconds);
    setDoneTimes(new Set());
    
    // 해당 시간의 과목 찾기
    let newTimename = TIMELINE[0].description;
    const newDoneTimes = new Set<string>();
    TIMELINE.forEach((one) => {
      const oneHours = Number(one.time.substring(0, 2));
      const oneMinutes = Number(one.time.substring(2, 4));
      const oneTotalSeconds = oneHours * 60 * 60 + oneMinutes * 60 - 29100;
      if (oneTotalSeconds <= targetSeconds) {
        newDoneTimes.add(one.time);
        newTimename = one.description;
      }
    });
    setCurrentTimename(newTimename);
    setDoneTimes(newDoneTimes);
  };

  // 슬라이더 값에서 5분 단위로 스냅
  const findNearest5MinuteTime = (sliderValue: number) => {
    const targetSeconds = (sliderValue / 100) * 30720; // 전체 시험 시간(30720초)의 비율
    
    // 5분 단위로 반올림 (300초 = 5분)
    const roundedSeconds = Math.round(targetSeconds / 300) * 300;
    
    // 범위 제한
    const clampedSeconds = Math.max(0, Math.min(30720, roundedSeconds));
    
    // seconds를 시간으로 변환 (08:05 기준)
    const totalSeconds = clampedSeconds + 29100; // 29100 = 8시간 5분
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    // HHmm 형식으로 변환
    const timeString = `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;
    
    return timeString;
  };

  // 슬라이더 값 변경 핸들러
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = Number(e.target.value);
    const nearestTime = findNearest5MinuteTime(sliderValue);
    jumpToTime(nearestTime);
  };

  // 실시간/시뮬레이션 모드 전환
  const toggleRealTime = () => {
    setUseRealTime(prev => {
      const newValue = !prev;
      if (newValue) {
        // 실시간 모드로 전환: 현재 시간 기준으로 리셋
        const newSeconds = getInitialSeconds();
        setSeconds(newSeconds);
        setDoneTimes(new Set());
        
        // 현재 과목 다시 계산
        let newTimename = TIMELINE[0].description;
        const newDoneTimes = new Set<string>();
        TIMELINE.forEach((one) => {
          const oneHours = Number(one.time.substring(0, 2));
          const oneMinutes = Number(one.time.substring(2, 4));
          const oneTotalSeconds = oneHours * 60 * 60 + oneMinutes * 60 - 29100;
          if (oneTotalSeconds <= newSeconds) {
            newDoneTimes.add(one.time);
            newTimename = one.description;
          }
        });
        setCurrentTimename(newTimename);
        setDoneTimes(newDoneTimes);
      } else {
        // 시뮬레이션 모드로 전환: 08:05부터 시작
        setSeconds(0);
        setDoneTimes(new Set());
        setCurrentTimename(TIMELINE[0].description);
      }
      return newValue;
    });
  };

  // 키보드 단축키
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
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    let audio = new Audio();
    let audioContext = new AudioContext();

    const sourceNode = audioContext.createMediaElementSource(audio);

    const reverbMix = 0.8; // wet / dry
    const reverbTime = 0.25; // 리버브 지속시간
    const reverbDecay = 0.1; // 리버브 감쇠 빠르기

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

    // DELAY //

    // Dry 소스 노드 연결
    inputNode.connect(delayDryGainNode);
    delayDryGainNode.connect(outputNode);
    delayDryGainNode.gain.value = 1 - delayMix;

    // Delay 루프 생성
    delayNode.connect(delayFeedbackNode);
    delayFeedbackNode.connect(delayNode);
    delayFeedbackNode.gain.value = delayFeedback;

    // Wet 소스 노드 연결
    inputNode.connect(delayNode);
    delayNode.connect(delayWetGainNode);
    delayWetGainNode.connect(outputNode);
    delayWetGainNode.gain.value = delayMix;

    // REVERB //

    // Dry 소스 노드 연결
    delayWetGainNode.connect(reverbDryGainNode);
    reverbDryGainNode.connect(outputNode);
    reverbDryGainNode.gain.value = 1 - reverbMix;

    // IR을 생성하여 Convolver의 오디오 버퍼에 입력해준다.
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

    // Wet 소스 노드 연결
    delayWetGainNode.connect(reverbNode);
    reverbNode.connect(reverbWetGainNode);
    reverbWetGainNode.connect(outputNode);
    reverbWetGainNode.gain.value = reverbMix;

    // COMPRESSOR //

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

  useEffect(() => {
    if (active) {
      let timer = setInterval(() => {
        setSeconds((prev) => {
          return prev + 1;
        });
      }, 1000);

      let interval = setInterval(() => {
        let current = dayjs()
          .startOf("day")
          .set("hour", 8)
          .set("minute", 5)
          .set("second", 0)
          .add(seconds, "seconds");

        let currentHourMin = current.format("HHmm");

        let newDoneTimes = new Set(doneTimes);

        let newCurrentTimename = "";

        TIMELINE.forEach((one) => {
          let oneHours = Number(one.time.substring(0, 2));
          let oneMinutes = Number(one.time.substring(2, 4));

          let oneTotalSeconds = oneHours * 60 * 60 + oneMinutes * 60 - 29100;

          if (oneTotalSeconds < seconds) {
            newDoneTimes.add(one.time);
            newCurrentTimename = one.description;
          }
        });

        if (!newDoneTimes.has(currentHourMin)) {
          let source = TIMELINE.find(
            (one) => one.time === currentHourMin && current.second() === 0
          );

          if (source?.audio && soundEnabled) {
            audio!.pause();
            // GitHub Pages basePath 지원
            const basePath = process.env.NODE_ENV === 'production' ? '/csat-simulator' : '';
            audio!.src = basePath + source.audio;
            audioContext?.resume()
              .then(() => audio!.play())
              .catch((err) => {
                console.warn('Audio playback failed:', err);
                // 자동 재생 실패 시 무시 (사용자가 클릭하면 재생됨)
              });

            newDoneTimes.add(current.format("HHmm"));

            setDoneTimes(newDoneTimes);

            newCurrentTimename = source.description;
          } else if (source?.audio && !soundEnabled) {
            // 소리는 끄지만 타임라인은 계속 진행
            newDoneTimes.add(current.format("HHmm"));
            setDoneTimes(newDoneTimes);
            newCurrentTimename = source.description;
          }
        }

        setCurrentTimename(newCurrentTimename);
      }, 100);

      return () => {
        clearInterval(timer);
        clearInterval(interval);
      };
    }
  }, [active, audio, audioContext, doneTimes, seconds, soundEnabled]);

  let current = dayjs()
    .startOf("day")
    .set("hour", 8)
    .set("minute", 5)
    .set("second", 0)
    .add(seconds, "seconds");

  return (
    <main className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 relative">
      {/* 시작 안내 메시지 (자동 재생 차단 시) */}
      {showStartPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-pulse">
          <div className="bg-white rounded-3xl p-12 shadow-2xl text-center">
            <div className="text-3xl font-bold text-gray-800 mb-4">
              화면을 클릭하여 시작하세요
            </div>
            <div className="text-xl text-gray-600">
              Click anywhere to start
            </div>
          </div>
        </div>
      )}

      {/* 컨트롤 버튼들 */}
      <div className="fixed top-4 right-4 flex gap-2 z-40">
        {/* 메뉴 토글 버튼 */}
        <button
          onClick={() => setShowControls(!showControls)}
          className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full p-3 shadow-lg transition-all"
          title="메뉴 (M)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* 컨트롤 패널 */}
      {showControls && (
        <div className="fixed top-20 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl z-40 min-w-[280px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">소리 재생</span>
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
              <span className="text-lg font-medium">시계 표시</span>
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

            <div className="pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 space-y-1">
                <p><kbd className="px-2 py-1 bg-gray-100 rounded">S</kbd> 소리 토글</p>
                <p><kbd className="px-2 py-1 bg-gray-100 rounded">C</kbd> 시계 토글</p>
                <p><kbd className="px-2 py-1 bg-gray-100 rounded">M</kbd> 메뉴 토글</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center select-none w-full">
        {/* 시계 - 매우 크게 (토글 가능) */}
        {clockVisible && (
          <div className="text-[120px] lg:text-[180px] font-bold text-gray-800 leading-none mb-12 transition-all">
            {current.format("HH:mm:ss")}
          </div>
        )}
        
        {/* 현재 과목/상태 - 화면 중앙에 크게 */}
        <div className={`font-bold text-indigo-900 px-8 transition-all ${
          clockVisible ? 'text-5xl lg:text-7xl mb-8' : 'text-7xl lg:text-9xl'
        }`}>
          {currentTimename}
        </div>

        {/* 진행 바와 슬라이더 영역 */}
        <div className={`w-[90vw] max-w-5xl mx-auto transition-all ${clockVisible ? 'mt-0' : 'mt-12'}`}>
          {/* 진행 바 */}
          <div className="mb-2">
            <div className="bg-white/50 rounded-full h-4 overflow-hidden shadow-lg">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${(seconds / 30720) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* 시뮬레이션 모드 타임라인 컨트롤 */}
          {!useRealTime && (
            <div className="w-[90vw] max-w-5xl mx-auto">
              {/* 버튼과 슬라이더 바 (상하 가운데 정렬) */}
              <div className="relative py-4 flex items-center gap-3">
                {/* 실시간 버튼 (왼쪽) */}
                <button
                  onClick={() => {
                    const newSeconds = getInitialSeconds();
                    setSeconds(newSeconds);
                    setDoneTimes(new Set());
                    let newTimename = TIMELINE[0].description;
                    const newDoneTimes = new Set<string>();
                    TIMELINE.forEach((one) => {
                      const oneHours = Number(one.time.substring(0, 2));
                      const oneMinutes = Number(one.time.substring(2, 4));
                      const oneTotalSeconds = oneHours * 60 * 60 + oneMinutes * 60 - 29100;
                      if (oneTotalSeconds <= newSeconds) {
                        newDoneTimes.add(one.time);
                        newTimename = one.description;
                      }
                    });
                    setCurrentTimename(newTimename);
                    setDoneTimes(newDoneTimes);
                  }}
                  className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all whitespace-nowrap"
                >
                  실시간
                </button>

                {/* 슬라이더 바 (진행 바와 같은 길이) */}
                <div className="flex-1 relative h-2">
                  {/* 배경 바 */}
                  <div className="absolute inset-0 bg-gray-300 rounded-full">
                    {/* 시간대 마커들 */}
                    {majorTimePoints.map((point) => {
                      const pointHours = Number(point.time.substring(0, 2));
                      const pointMinutes = Number(point.time.substring(2, 4));
                      const pointSeconds = pointHours * 60 * 60 + pointMinutes * 60 - 29100;
                      const position = (pointSeconds / 30720) * 100;
                      
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

                  {/* 슬라이더 (바 위에 겹침) */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={(seconds / 30720) * 100}
                    onChange={handleSliderChange}
                    className="absolute inset-0 w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:shadow-xl [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
                  />
                </div>
              </div>

              {/* 시간대 레이블 (슬라이더 아래) */}
              <div className="flex items-start gap-3">
                {/* 버튼 자리 (빈 공간) */}
                <div className="flex-shrink-0 px-4 py-2 opacity-0 pointer-events-none text-sm font-medium whitespace-nowrap">
                  실시간
                </div>
                
                {/* 레이블 영역 (슬라이더와 같은 너비) */}
                <div className="flex-1 relative h-12">
                  {majorTimePoints.map((point) => {
                    const pointHours = Number(point.time.substring(0, 2));
                    const pointMinutes = Number(point.time.substring(2, 4));
                    const pointSeconds = pointHours * 60 * 60 + pointMinutes * 60 - 29100;
                    const position = (pointSeconds / 30720) * 100;
                    
                    return (
                      <div
                        key={point.time}
                        className="absolute -translate-x-1/2 text-center cursor-pointer hover:scale-110 transition-transform"
                        style={{ left: `${position}%` }}
                        onClick={() => jumpToTime(point.time)}
                      >
                        <div className="text-sm font-bold text-gray-800 whitespace-nowrap">{point.label}</div>
                        <div className="text-xs text-gray-500">
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

      {/* 상태 인디케이터 (화면 왼쪽 하단) */}
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
