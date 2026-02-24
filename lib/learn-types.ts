/**
 * Type definitions for the Learn (financial education) module.
 *
 * Defines the data shapes for educational topics, user progress tracking,
 * quiz questions, and assembled topic content used by the Learn page.
 *
 * @module lib/learn-types
 */

/** Metadata for a single educational topic displayed in the Learn section. */
export interface LearnTopic {
  /** Unique slug identifier (e.g. "what-is-investing"). */
  id: string
  /** Display title of the topic. */
  title: string
  /** Short description shown in topic cards. */
  description: string
  /** Parent section ID (e.g. "getting-started"). */
  section: string
  /** Content difficulty level. */
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  /** Estimated reading time (e.g. "5 min"). */
  readTime: string
  /** Tabler icon name for the topic card. */
  icon: string
  /** Search/filter tags. */
  tags: string[]
}

/** Tracks a user's progress on a single learn topic. */
export interface LearnProgress {
  /** Topic this progress record belongs to. */
  topicId: string
  /** Current completion status progressing through the lifecycle. */
  status: 'unread' | 'read' | 'quizzed' | 'mastered'
  /** Quiz score as a percentage (0-100), set after taking the quiz. */
  quizScore?: number
  /** ISO timestamp when the article was first read. */
  readAt?: string
  /** ISO timestamp when the quiz was last attempted. */
  quizzedAt?: string
}

/** A single multiple-choice quiz question for a learn topic. */
export interface QuizQuestion {
  /** The question text. */
  question: string
  /** Array of 4 answer choices. */
  options: string[]
  /** Zero-based index of the correct answer in `options`. */
  correctIndex: number
  /** Explanation shown after the user answers (right or wrong). */
  explanation: string
}

/** Assembled content for a single topic: metadata, markdown article, and quiz. */
export interface TopicContent {
  /** Topic metadata (title, description, difficulty, etc.). */
  topic: LearnTopic
  /** Full article content in Markdown format. */
  content: string
  /** Quiz questions for comprehension testing. */
  quiz: QuizQuestion[]
}
