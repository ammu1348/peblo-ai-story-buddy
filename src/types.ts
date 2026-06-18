export interface QuizData {
  question: string;
  options: string[];
  answer: string;
}

export interface StoryData {
  story: string;
  quiz: QuizData;
}

export type PipRobotState = "idle" | "thinking" | "speaking" | "success" | "dizzy";

export type TTSMode = "native" | "gemini";

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
}
