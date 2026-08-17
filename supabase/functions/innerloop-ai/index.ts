import { createClient } from 'npm:@supabase/supabase-js@2'

// Environment variables
const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY')
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const AI_PROVIDER = Deno.env.get('AI_PROVIDER') || 'gemini' // 'gemini' | 'nvidia'
const AI_MODEL = Deno.env.get('AI_MODEL') // Optional override

// Validate required environment variables at startup
if (!NVIDIA_API_KEY) {
  console.error('[STARTUP] NVIDIA_API_KEY is not configured')
}
if (!GEMINI_API_KEY) {
  console.error('[STARTUP] GEMINI_API_KEY is not configured')
}
if (!SUPABASE_URL) {
  console.error('[STARTUP] SUPABASE_URL is not configured')
}
if (!SUPABASE_ANON_KEY) {
  console.error('[STARTUP] SUPABASE_ANON_KEY is not configured')
}

// Model configuration - configurable via env vars
const NVIDIA_MODEL_NAME = AI_MODEL || 'meta/llama-3.1-70b-instruct'
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

const GEMINI_MODEL_NAME = AI_MODEL || 'gemini-1.5-flash' // Use flash for faster responses
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

console.log(`[STARTUP] AI Provider: ${AI_PROVIDER}`)
console.log(`[STARTUP] NVIDIA model: ${NVIDIA_MODEL_NAME}`)
console.log(`[STARTUP] NVIDIA API URL: ${NVIDIA_API_URL}`)
console.log(`[STARTUP] Gemini model: ${GEMINI_MODEL_NAME}`)
console.log(`[STARTUP] Gemini API URL: ${GEMINI_API_URL}`)

// Supabase client for database operations
function getSupabaseClient(authHeader: string | null) {
  const client  = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  })
  return client
}

// Helper to get current date in ISO format
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Helper to get tomorrow's date
function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

// Helper to get yesterday's date
function getYesterdayDate(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

// Helper to parse relative dates
function parseRelativeDate(text: string): string | null {
  const lower = text.toLowerCase().trim()
  const today = getCurrentDate()

  if (lower === 'today' || lower === 'tonight' || lower === 'this evening') {
    return today
  }
  if (lower === 'tomorrow') {
    return getTomorrowDate()
  }
  if (lower === 'yesterday') {
    return getYesterdayDate()
  }

  // Check for day names (e.g., "Monday", "next Monday")
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const targetDay = i
      const currentDay = new Date().getDay()
      let diff = targetDay - currentDay
      if (diff <= 0) diff += 7
      if (lower.includes('next')) diff += 7

      const date = new Date()
      date.setDate(date.getDate() + diff)
      return date.toISOString().split('T')[0]
    }
  }

  // Check for explicit date formats like "2024-01-15" or "Jan 15"
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (dateMatch) return dateMatch[1]

  return null
}

// Helper to parse time
function parseTime(text: string): string | null {
  // Match times like "7 PM", "7:30 PM", "19:00", "7pm"
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/)
  if (timeMatch) {
    let hours = parseInt(timeMatch[1])
    const minutes = timeMatch[2] ? timeMatch[2] : '00'
    const meridiem = timeMatch[3]?.toLowerCase()

    if (meridiem === 'pm' && hours < 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0

    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }
  return null
}

// ============================================
// LLM API Functions
// ============================================

// Call NVIDIA API (OpenAI-compatible)
async function callNVIDIA(messages: any[], tools: any[] = [], toolChoice: any = 'auto') {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured')
  }

  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL_NAME,
      messages,
      tools,
      tool_choice: toolChoice,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`NVIDIA API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Call Google Gemini API
async function callGemini(messages: any[], tools: any[] = [], toolChoice: any = 'auto') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  // Convert OpenAI-style messages to Gemini format
  const geminiMessages = messages.map(msg => {
    if (msg.role === 'system') {
      // System messages become user messages with a special prefix in Gemini
      return {
        role: 'user',
        parts: [{ text: `System: ${msg.content}` }]
      }
    } else if (msg.role === 'assistant' && msg.tool_calls) {
      // Handle tool calls from assistant
      return {
        role: 'model',
        parts: msg.tool_calls.map((tc: any) => ({
          functionCall: {
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments)
          }
        }))
      }
    } else if (msg.role === 'tool') {
      // Tool results
      return {
        role: 'user',
        parts: [{
          functionResponse: {
            name: msg.name,
            response: { result: msg.content }
          }
        }]
      }
    } else {
      // Regular user/assistant messages
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content || '' }]
      }
    }
  })

  // Convert tools to Gemini format
  const geminiTools = tools.map(tool => ({
    functionDeclarations: [{
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    }]
  }))

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: geminiMessages,
      tools: geminiTools.length > 0 ? geminiTools : undefined,
      toolConfig: toolChoice !== 'none' ? {
        functionCallingConfig: {
          mode: toolChoice === 'auto' ? 'AUTO' : 'ANY'
        }
      } : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  
  // Convert Gemini response to OpenAI-compatible format
  const candidate = data.candidates?.[0]
  if (!candidate) {
    throw new Error('No response from Gemini')
  }

  const parts = candidate.content?.parts || []
  const toolCalls = parts
    .filter((p: any) => p.functionCall)
    .map((p: any, i: number) => ({
      id: `call_${Date.now()}_${i}`,
      type: 'function',
      function: {
        name: p.functionCall.name,
        arguments: JSON.stringify(p.functionCall.args)
      }
    }))

  return {
    choices: [{
      message: {
        role: 'assistant',
        content: parts.find((p: any) => p.text)?.text || '',
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
      },
      finish_reason: candidate.finishReason || 'stop'
    }]
  }
}

// Main LLM call function - tries Gemini first, falls back to NVIDIA
async function callLLM(messages: any[], tools: any[] = [], toolChoice: any = 'auto') {
  // Try Gemini first if available
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(messages, tools, toolChoice)
    } catch (error) {
      console.warn('[LLM] Gemini call failed, falling back to NVIDIA:', error)
    }
  }
  
  // Fall back to NVIDIA
  if (NVIDIA_API_KEY) {
    return await callNVIDIA(messages, tools, toolChoice)
  }
  
  throw new Error('No LLM API keys configured')
}

// ============================================
// Tool implementations
// ============================================

// Task tools
async function createTask(supabase: any, args: any, userId: string) {
  const { title, description, priority, due_date } = args
  console.log('[AI][TASK] create_task called');
  console.log('[AI][TASK] authenticated user:', userId);
  console.log('[AI][TASK] inserting task:', { title, description, priority, due_date });
  
  const data = {
    title,
    description: description || '',
    priority: priority || 'medium',
    due_date: due_date ? parseRelativeDate(due_date) || due_date : null,
    completed: false,
    created_by_id: userId,
  }
  const { data: result, error } = await supabase.from('tasks').insert(data).select().single()
  if (error) {
    console.error('[AI][TASK] Supabase error:', error);
    throw error
  }
  console.log('[AI][TASK] Supabase response:', result);
  console.log('[AI][TASK] created task ID:', result?.id);
  return result
}

async function updateTask(supabase: any, args: any, userId: string) {
  const { id, title, description, priority, due_date, completed } = args
  const data: any = {}
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description
  if (priority !== undefined) data.priority = priority
  if (due_date !== undefined) data.due_date = parseRelativeDate(due_date) || due_date
  if (completed !== undefined) data.completed = completed

  const { data: result, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .eq('created_by_id', userId)
    .select()
    .single()
  if (error) throw error
  return result
}

async function deleteTask(supabase: any, args: any, userId: string) {
  const { id } = args
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('created_by_id', userId)
  if (error) throw error
  return { success: true }
}

async function completeTask(supabase: any, args: any, userId: string) {
  const { id } = args
  const { data: result, error } = await supabase
    .from('tasks')
    .update({ completed: true })
    .eq('id', id)
    .eq('created_by_id', userId)
    .select()
    .single()
  if (error) throw error
  return result
}

async function listTasks(supabase: any, args: any, userId: string) {
  const { completed, due_date, priority, limit } = args
  let query = supabase.from('tasks').select('*').eq('created_by_id', userId)

  if (completed !== undefined) query = query.eq('completed', completed)
  if (due_date) {
    const parsedDate = parseRelativeDate(due_date) || due_date
    query = query.eq('due_date', parsedDate)
  }
  if (priority) query = query.eq('priority', priority)

  query = query.order('created_at', { ascending: false }).limit(limit || 50)

  const { data, error } = await query
  if (error) throw error
  return data
}

async function searchTasks(supabase: any, args: any, userId: string) {
  const { query: searchQuery, limit } = args
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('created_by_id', userId)
    .ilike('title', `%${searchQuery}%`)
    .order('created_at', { ascending: false })
    .limit(limit || 20)
  if (error) throw error
  return data
}

// Habit tools
async function createHabit(supabase: any, args: any, userId: string) {
  const { name, description, icon, color, frequency, target_days, reminder_time } = args
  const data = {
    name,
    description: description || '',
    icon: icon || '🎯',
    color: color || '#3B82F6',
    frequency: frequency || 'daily',
    target_days: target_days || [],
    reminder_time: reminder_time || null,
    is_active: true,
    created_by_id: userId,
  }
  const { data: result, error } = await supabase.from('habits').insert(data).select().single()
  if (error) throw error
  return result
}

async function updateHabit(supabase: any, args: any, userId: string) {
  const { id, name, description, icon, color, frequency, target_days, reminder_time, is_active } = args
  const data: any = {}
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description
  if (icon !== undefined) data.icon = icon
  if (color !== undefined) data.color = color
  if (frequency !== undefined) data.frequency = frequency
  if (target_days !== undefined) data.target_days = target_days
  if (reminder_time !== undefined) data.reminder_time = reminder_time
  if (is_active !== undefined) data.is_active = is_active

  const { data: result, error } = await supabase
    .from('habits')
    .update(data)
    .eq('id', id)
    .eq('created_by_id', userId)
    .select()
    .single()
  if (error) throw error
  return result
}

async function deleteHabit(supabase: any, args: any, userId: string) {
  const { id } = args
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .eq('created_by_id', userId)
  if (error) throw error
  return { success: true }
}

async function toggleHabit(supabase: any, args: any, userId: string) {
  const { id, completed } = args
  const today = getCurrentDate()

  // Check if log exists
  const { data: existingLog } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', id)
    .eq('date', today)
    .eq('created_by_id', userId)
    .single()

  if (existingLog) {
    const { data: result, error } = await supabase
      .from('habit_logs')
      .update({ completed })
      .eq('id', existingLog.id)
      .select()
      .single()
    if (error) throw error
    return result
  } else {
    const { data: result, error } = await supabase
      .from('habit_logs')
      .insert({ habit_id: id, date: today, completed, created_by_id: userId })
      .select()
      .single()
    if (error) throw error
    return result
  }
}

async function logHabit(supabase: any, args: any, userId: string) {
  return toggleHabit(supabase, args, userId)
}

async function listHabits(supabase: any, args: any, userId: string) {
  const { is_active, frequency, limit } = args
  let query = supabase.from('habits').select('*').eq('created_by_id', userId)

  if (is_active !== undefined) query = query.eq('is_active', is_active)
  if (frequency) query = query.eq('frequency', frequency)

  query = query.order('created_at', { ascending: false }).limit(limit || 50)

  const { data, error } = await query
  if (error) throw error
  return data
}

// Timetable tools
async function createTimetableSlot(supabase: any, args: any, userId: string) {
  const { title, type, date, start_time, end_time, color, reference_id } = args
  const data = {
    title,
    type: type || 'other',
    date: parseRelativeDate(date) || date,
    start_time,
    end_time,
    color: color || null,
    reference_id: reference_id || null,
    completed: false,
    created_by_id: userId,
  }
  const { data: result, error } = await supabase.from('timetable_slots').insert(data).select().single()
  if (error) throw error
  return result
}

async function updateTimetableSlot(supabase: any, args: any, userId: string) {
  const { id, title, type, date, start_time, end_time, color, completed, reference_id } = args
  const data: any = {}
  if (title !== undefined) data.title = title
  if (type !== undefined) data.type = type
  if (date !== undefined) data.date = parseRelativeDate(date) || date
  if (start_time !== undefined) data.start_time = start_time
  if (end_time !== undefined) data.end_time = end_time
  if (color !== undefined) data.color = color
  if (completed !== undefined) data.completed = completed
  if (reference_id !== undefined) data.reference_id = reference_id

  const { data: result, error } = await supabase
    .from('timetable_slots')
    .update(data)
    .eq('id', id)
    .eq('created_by_id', userId)
    .select()
    .single()
  if (error) throw error
  return result
}

async function deleteTimetableSlot(supabase: any, args: any, userId: string) {
  const { id } = args
  const { error } = await supabase
    .from('timetable_slots')
    .delete()
    .eq('id', id)
    .eq('created_by_id', userId)
  if (error) throw error
  return { success: true }
}

async function listTimetable(supabase: any, args: any, userId: string) {
  const { date, type, completed, limit } = args
  let query = supabase.from('timetable_slots').select('*').eq('created_by_id', userId)

  if (date) {
    const parsedDate = parseRelativeDate(date) || date
    query = query.eq('date', parsedDate)
  }
  if (type) query = query.eq('type', type)
  if (completed !== undefined) query = query.eq('completed', completed)

  query = query.order('start_time', { ascending: true }).limit(limit || 100)

  const { data, error } = await query
  if (error) throw error
  return data
}

async function copyTimetable(supabase: any, args: any, userId: string) {
  const { source_date, target_date, days } = args
  const parsedSourceDate = parseRelativeDate(source_date) || source_date
  const parsedTargetDate = parseRelativeDate(target_date) || target_date

  // Get source slots
  const { data: sourceSlots, error: fetchError } = await supabase
    .from('timetable_slots')
    .select('*')
    .eq('date', parsedSourceDate)
    .eq('created_by_id', userId)
  if (fetchError) throw fetchError

  if (!sourceSlots.length) return { copied: 0 }

  const newSlots = sourceSlots.map((slot: any) => ({
    title: slot.title,
    type: slot.type,
    date: parsedTargetDate,
    start_time: slot.start_time,
    end_time: slot.end_time,
    color: slot.color,
    reference_id: slot.reference_id,
    completed: false,
    created_by_id: userId,
  }))

  const { error } = await supabase.from('timetable_slots').insert(newSlots)
  if (error) throw error

  return { copied: newSlots.length }
}

// Exercise tools
async function createExercise(supabase: any, args: any, userId: string) {
  const { name, type, category, level, description, duration_minutes, sets, reps, image_url } = args
  const data = {
    name,
    type: type || 'gym',
    category: category || '',
    level: level || 'beginner',
    description: description || '',
    duration_minutes: duration_minutes || 30,
    sets: sets || 3,
    reps: reps || 12,
    image_url: image_url || null,
    created_by_id: userId,
  }
  const { data: result, error } = await supabase.from('exercises').insert(data).select().single()
  if (error) throw error
  return result
}

async function updateExercise(supabase: any, args: any, userId: string) {
  const { id, name, type, category, level, description, duration_minutes, sets, reps, image_url } = args
  const data: any = {}
  if (name !== undefined) data.name = name
  if (type !== undefined) data.type = type
  if (category !== undefined) data.category = category
  if (level !== undefined) data.level = level
  if (description !== undefined) data.description = description
  if (duration_minutes !== undefined) data.duration_minutes = duration_minutes
  if (sets !== undefined) data.sets = sets
  if (reps !== undefined) data.reps = reps
  if (image_url !== undefined) data.image_url = image_url

  const { data: result, error } = await supabase
    .from('exercises')
    .update(data)
    .eq('id', id)
    .eq('created_by_id', userId)
    .select()
    .single()
  if (error) throw error
  return result
}

async function deleteExercise(supabase: any, args: any, userId: string) {
  const { id } = args
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id)
    .eq('created_by_id', userId)
  if (error) throw error
  return { success: true }
}

async function logExercise(supabase: any, args: any, userId: string) {
  const { exercise_id, date, completed, duration_minutes, sets_completed, reps_completed, notes } = args
  const parsedDate = parseRelativeDate(date) || date || getCurrentDate()

  // Check if log exists
  const { data: existingLog } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('exercise_id', exercise_id)
    .eq('date', parsedDate)
    .eq('created_by_id', userId)
    .single()

  if (existingLog) {
    if (!completed) {
      const { error } = await supabase
        .from('exercise_logs')
        .delete()
        .eq('id', existingLog.id)
      if (error) throw error
      return { deleted: true }
    }
    const { data: result, error } = await supabase
      .from('exercise_logs')
      .update({ completed, duration_minutes, sets_completed, reps_completed, notes })
      .eq('id', existingLog.id)
      .select()
      .single()
    if (error) throw error
    return result
  } else if (completed) {
    const { data: result, error } = await supabase
      .from('exercise_logs')
      .insert({
        exercise_id,
        date: parsedDate,
        completed: true,
        duration_minutes,
        sets_completed,
        reps_completed,
        notes,
        created_by_id: userId,
      })
      .select()
      .single()
    if (error) throw error
    return result
  }
  return { success: true }
}

async function listExercises(supabase: any, args: any, userId: string) {
  const { type, category, level, limit } = args
  let query = supabase.from('exercises').select('*').eq('created_by_id', userId)

  if (type) query = query.eq('type', type)
  if (category) query = query.eq('category', category)
  if (level) query = query.eq('level', level)

  query = query.order('created_at', { ascending: false }).limit(limit || 50)

  const { data, error } = await query
  if (error) throw error
  return data
}

// Sleep tools
async function createSleepLog(supabase: any, args: any, userId: string) {
  const { date, bed_time, wake_time, sleep_quality, notes } = args
  const data = {
    date: parseRelativeDate(date) || date || getCurrentDate(),
    bed_time,
    wake_time,
    sleep_quality: sleep_quality || 3,
    notes: notes || '',
    created_by_id: userId,
  }
  const { data: result, error } = await supabase.from('sleep_logs').insert(data).select().single()
  if (error) throw error
  return result
}

async function updateSleepLog(supabase: any, args: any, userId: string) {
  const { id, date, bed_time, wake_time, sleep_quality, notes } = args
  const data: any = {}
  if (date !== undefined) data.date = parseRelativeDate(date) || date
  if (bed_time !== undefined) data.bed_time = bed_time
  if (wake_time !== undefined) data.wake_time = wake_time
  if (sleep_quality !== undefined) data.sleep_quality = sleep_quality
  if (notes !== undefined) data.notes = notes

  const { data: result, error } = await supabase
    .from('sleep_logs')
    .update(data)
    .eq('id', id)
    .eq('created_by_id', userId)
    .select()
    .single()
  if (error) throw error
  return result
}

async function deleteSleepLog(supabase: any, args: any, userId: string) {
  const { id } = args
  const { error } = await supabase
    .from('sleep_logs')
    .delete()
    .eq('id', id)
    .eq('created_by_id', userId)
  if (error) throw error
  return { success: true }
}

async function listSleepLogs(supabase: any, args: any, userId: string) {
  const { limit } = args
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('created_by_id', userId)
    .order('date', { ascending: false })
    .limit(limit || 30)
  if (error) throw error
  return data
}

// Analytics tools
async function getProductivitySummary(supabase: any, args: any, userId: string) {
  const today = getCurrentDate()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  const [tasks, slots, habits, habitLogs] = await Promise.all([
    supabase.from('tasks').select('*').eq('created_by_id', userId).eq('completed', true).gte('created_at', weekAgoStr),
    supabase.from('timetable_slots').select('*').eq('created_by_id', userId).eq('completed', true).gte('date', weekAgoStr),
    supabase.from('habits').select('*').eq('created_by_id', userId).eq('is_active', true),
    supabase.from('habit_logs').select('*').eq('created_by_id', userId).eq('completed', true).gte('date', weekAgoStr),
  ])

  const completedTasks = tasks.data?.length || 0
  const completedSlots = slots.data?.length || 0
  const totalHabits = habits.data?.length || 0
  const completedHabits = habitLogs.data?.length || 0

  return {
    period: 'last_7_days',
    completed_tasks: completedTasks,
    completed_schedule_slots: completedSlots,
    total_active_habits: totalHabits,
    completed_habit_logs: completedHabits,
    habit_completion_rate: totalHabits > 0 ? Math.round((completedHabits / (totalHabits * 7)) * 100) : 0,
  }
}

async function getHabitSummary(supabase: any, args: any, userId: string) {
  const { period = 'week' } = args
  const days = period === 'week' ? 7 : 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const [habits, logs] = await Promise.all([
    supabase.from('habits').select('*').eq('created_by_id', userId).eq('is_active', true),
    supabase.from('habit_logs').select('*').eq('created_by_id', userId).eq('completed', true).gte('date', startDateStr),
  ])

  const habitStats = (habits.data || []).map(habit => {
    const habitLogs = logs.data?.filter(l => l.habit_id === habit.id) || []
    return {
      habit_id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      completed_count: habitLogs.length,
      streak: calculateStreak(habit.id, logs.data || []),
    }
  })

  return {
    period: `last_${days}_days`,
    habits: habitStats,
    total_habits: habits.data?.length || 0,
    total_completed: logs.data?.length || 0,
  }
}

function calculateStreak(habitId: string, logs: any[]) {
  let streak = 0
  const sortedLogs = logs
    .filter(l => l.habit_id === habitId && l.completed)
    .map(l => l.date)
    .sort((a, b) => b.localeCompare(a))

  const today = getCurrentDate()
  let currentDate = new Date()

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0]
    if (sortedLogs.includes(dateStr)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else if (dateStr !== today) {
      break
    } else {
      currentDate.setDate(currentDate.getDate() - 1)
    }
  }
  return streak
}

async function getSleepSummary(supabase: any, args: any, userId: string) {
  const { period = 'week' } = args
  const days = period === 'week' ? 7 : 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const { data: logs, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('created_by_id', userId)
    .gte('date', startDateStr)
    .order('date', { ascending: true })

  if (error) throw error

  const calculateHours = (bed: string, wake: string) => {
    if (!bed || !wake) return 0
    const bedTime = new Date(`2000-01-01T${bed}`)
    const wakeTime = new Date(`2000-01-01T${wake}`)
    let diff = (wakeTime - bedTime) / (1000 * 60 * 60)
    if (diff < 0) diff += 24
    return diff
  }

  const logsWithHours = (logs || []).map(log => ({
    ...log,
    hours: calculateHours(log.bed_time, log.wake_time),
  }))

  const avgHours = logsWithHours.length > 0
    ? logsWithHours.reduce((acc, l) => acc + l.hours, 0) / logsWithHours.length
    : 0
  const avgQuality = logsWithHours.length > 0
    ? logsWithHours.reduce((acc, l) => acc + (l.sleep_quality || 0), 0) / logsWithHours.length
    : 0

  return {
    period: `last_${days}_days`,
    total_logs: logsWithHours.length,
    average_hours: Math.round(avgHours * 10) / 10,
    average_quality: Math.round(avgQuality * 10) / 10,
    logs: logsWithHours,
  }
}

async function getDailySummary(supabase: any, args: any, userId: string) {
  const date = args.date ? parseRelativeDate(args.date) || args.date : getCurrentDate()

  const [tasks, slots, habits, habitLogs, sleep, exercises] = await Promise.all([
    supabase.from('tasks').select('*').eq('created_by_id', userId).eq('due_date', date),
    supabase.from('timetable_slots').select('*').eq('created_by_id', userId).eq('date', date),
    supabase.from('habits').select('*').eq('created_by_id', userId).eq('is_active', true),
    supabase.from('habit_logs').select('*').eq('created_by_id', userId).eq('date', date),
    supabase.from('sleep_logs').select('*').eq('created_by_id', userId).eq('date', date).single(),
    supabase.from('exercise_logs').select('*').eq('created_by_id', userId).eq('date', date).eq('completed', true),
  ])

  return {
    date,
    tasks: {
      total: tasks.data?.length || 0,
      completed: tasks.data?.filter(t => t.completed).length || 0,
    },
    schedule: {
      total: slots.data?.length || 0,
      completed: slots.data?.filter(s => s.completed).length || 0,
    },
    habits: {
      total: habits.data?.length || 0,
      completed: habitLogs.data?.filter(h => h.completed).length || 0,
    },
    sleep: sleep.data || null,
    exercises: exercises.data?.length || 0,
  }
}

async function getWeeklySummary(supabase: any, args: any, userId: string) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)
  const startDateStr = startDate.toISOString().split('T')[0]

  const [tasks, slots, habitLogs, sleepLogs, exerciseLogs] = await Promise.all([
    supabase.from('tasks').select('*').eq('created_by_id', userId).eq('completed', true).gte('updated_at', startDateStr),
    supabase.from('timetable_slots').select('*').eq('created_by_id', userId).eq('completed', true).gte('date', startDateStr),
    supabase.from('habit_logs').select('*').eq('created_by_id', userId).eq('completed', true).gte('date', startDateStr),
    supabase.from('sleep_logs').select('*').eq('created_by_id', userId).gte('date', startDateStr),
    supabase.from('exercise_logs').select('*').eq('created_by_id', userId).eq('completed', true).gte('date', startDateStr),
  ])

  return {
    period: 'last_7_days',
    completed_tasks: tasks.data?.length || 0,
    completed_schedule_slots: slots.data?.length || 0,
    completed_habits: habitLogs.data?.length || 0,
    sleep_logs: sleepLogs.data?.length || 0,
    exercise_sessions: exerciseLogs.data?.length || 0,
  }
}

async function getDashboardData(supabase: any, args: any, userId: string) {
  const today = getCurrentDate()

  const [tasks, habits, habitLogs, slots, sleepLogs] = await Promise.all([
    supabase.from('tasks').select('*').eq('created_by_id', userId).eq('completed', false),
    supabase.from('habits').select('*').eq('created_by_id', userId).eq('is_active', true),
    supabase.from('habit_logs').select('*').eq('created_by_id', userId).eq('date', today),
    supabase.from('timetable_slots').select('*').eq('created_by_id', userId).eq('date', today),
    supabase.from('sleep_logs').select('*').eq('created_by_id', userId).order('date', { ascending: false }).limit(7),
  ])

  const completedHabitsToday = habitLogs.data?.filter(h => h.completed).length || 0
  const completedSlotsToday = slots.data?.filter(s => s.completed).length || 0

  const avgSleep = sleepLogs.data && sleepLogs.data.length > 0
    ? sleepLogs.data.reduce((acc, log) => {
        if (log.bed_time && log.wake_time) {
          const bed = new Date(`2000-01-01T${log.bed_time}`)
          const wake = new Date(`2000-01-01T${log.wake_time}`)
          let diff = (wake - bed) / (1000 * 60 * 60)
          if (diff < 0) diff += 24
          return acc + diff
        }
        return acc
      }, 0) / sleepLogs.data.length
    : 0

  return {
    today,
    pending_tasks: tasks.data?.length || 0,
    active_habits: habits.data?.length || 0,
    completed_habits_today: completedHabitsToday,
    schedule_today: {
      total: slots.data?.length || 0,
      completed: completedSlotsToday,
    },
    average_sleep_hours: Math.round(avgSleep * 10) / 10,
  }
}

// Notification tools
async function createNotification(supabase: any, args: any, userId: string) {
  const { title, content, type, action_url } = args
  const data = {
    title,
    content: content || '',
    type: type || 'info',
    read: false,
    action_url: action_url || null,
    created_by_id: userId,
  }
  const { data: result, error } = await supabase.from('notifications').insert(data).select().single()
  if (error) throw error
  return result
}

// ============================================
// AI Auto-Scheduler Tool
// ============================================

async function scheduleTasks(supabase: any, args: any, userId: string) {
  const { date, task_ids, preferred_start, preferred_end } = args
  const targetDate = parseRelativeDate(date) || date || getTomorrowDate()
  const startTime = preferred_start || '09:00'
  const endTime = preferred_end || '22:00'

  // Get pending tasks for the user
  let taskQuery = supabase.from('tasks').select('*').eq('created_by_id', userId).eq('completed', false).order('priority', { ascending: false }).order('due_date', { ascending: true })
  
  if (task_ids && task_ids.length > 0) {
    taskQuery = taskQuery.in('id', task_ids)
  }

  const { data: tasks, error: tasksError } = await taskQuery
  if (tasksError) throw tasksError

  // Get existing timetable for the date
  const { data: existingSlots } = await supabase
    .from('timetable_slots')
    .select('*')
    .eq('created_by_id', userId)
    .eq('date', targetDate)
    .order('start_time', { ascending: true })

  // Get user's active habits for the day
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('created_by_id', userId)
    .eq('is_active', true)

  // Get habit logs for today to see what's already done
  const { data: habitLogs } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('created_by_id', userId)
    .eq('date', targetDate)

  // Parse existing slots to find available time blocks
  const occupiedSlots = (existingSlots || []).map(s => ({
    start: s.start_time,
    end: s.end_time,
    title: s.title,
    type: s.type,
  }))

  // Build schedule proposal
  const schedule = []
  let currentTime = startTime
  const dayEnd = endTime

  // Helper to convert time to minutes
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const startMins = timeToMinutes(startTime)
  const endMins = timeToMinutes(endTime)
  let cursor = startMins

  // Add morning routine if habits exist
  if (habits && habits.length > 0) {
    const morningHabits = habits.filter(h => !habitLogs?.some(l => l.habit_id === h.id && l.completed))
    if (morningHabits.length > 0) {
      const habitDuration = Math.min(30, Math.floor(60 / Math.max(1, morningHabits.length)))
      const slotEnd = Math.min(cursor + habitDuration, endMins)
      if (slotEnd > cursor) {
        schedule.push({
          title: 'Morning Habits',
          type: 'habit',
          date: targetDate,
          start_time: minutesToTime(cursor),
          end_time: minutesToTime(slotEnd),
          color: '#F59E0B',
          reference_id: null,
        })
        cursor = slotEnd + 15 // 15 min buffer
      }
    }
  }

  // Schedule tasks based on priority and due date
  for (const task of tasks || []) {
    if (cursor >= endMins - 30) break // Stop if less than 30 min left

    // Estimate task duration based on priority
    const durationMap = { high: 90, medium: 60, low: 45 }
    const duration = durationMap[task.priority as keyof typeof durationMap] || 60
    
    const slotEnd = Math.min(cursor + duration, endMins)
    if (slotEnd - cursor < 30) break // Skip if less than 30 min

    schedule.push({
      title: task.title,
      type: 'study',
      date: targetDate,
      start_time: minutesToTime(cursor),
      end_time: minutesToTime(slotEnd),
      color: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#22C55E',
      reference_id: task.id,
    })
    cursor = slotEnd + 15 // 15 min buffer
  }

  // Add evening wind-down
  if (cursor < endMins - 30) {
    schedule.push({
      title: 'Evening Wind-down',
      type: 'break',
      date: targetDate,
      start_time: minutesToTime(cursor),
      end_time: minutesToTime(Math.min(cursor + 30, endMins)),
      color: '#8B5CF6',
      reference_id: null,
    })
  }

  return {
    date: targetDate,
    proposed_schedule: schedule,
    tasks_considered: tasks?.length || 0,
    habits_considered: habits?.length || 0,
    existing_slots: occupiedSlots.length,
    requires_confirmation: true,
  }
}

async function confirmScheduleTasks(supabase: any, args: any, userId: string) {
  const { date, schedule } = args
  const targetDate = parseRelativeDate(date) || date

  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return { created: 0, error: 'No schedule provided' }
  }

  // Prepare slots for bulk insert
  const slotsToCreate = schedule.map((slot: any) => ({
    title: slot.title,
    type: slot.type || 'other',
    date: targetDate,
    start_time: slot.start_time,
    end_time: slot.end_time,
    color: slot.color || null,
    reference_id: slot.reference_id || null,
    completed: false,
    created_by_id: userId,
  }))

  const { data, error } = await supabase
    .from('timetable_slots')
    .insert(slotsToCreate)
    .select()

  if (error) throw error

  return {
    created: data?.length || 0,
    slots: data,
    message: `Successfully created ${data?.length || 0} schedule entries for ${targetDate}`,
  }
}

// ============================================
// Tool definitions for NVIDIA/Gemini (OpenAI-compatible function calling)
// ============================================

// Tool groups for routing - only send relevant tools based on user intent
const TOOL_GROUPS = {
  tasks: [
    'create_task', 'update_task', 'delete_task', 'complete_task',
    'list_tasks', 'search_tasks'
  ],
  habits: [
    'create_habit', 'update_habit', 'delete_habit', 'toggle_habit',
    'log_habit', 'list_habits'
  ],
  timetable: [
    'create_timetable_slot', 'update_timetable_slot', 'delete_timetable_slot',
    'list_timetable', 'copy_timetable', 'schedule_tasks', 'confirm_schedule_tasks'
  ],
  exercise: [
    'create_exercise', 'update_exercise', 'delete_exercise',
    'log_exercise', 'list_exercises'
  ],
  sleep: [
    'create_sleep_log', 'update_sleep_log', 'delete_sleep_log',
    'list_sleep_logs'
  ],
  analytics: [
    'get_productivity_summary', 'get_habit_summary', 'get_sleep_summary',
    'get_daily_summary', 'get_weekly_summary', 'get_dashboard_data'
  ],
  notifications: [
    'create_notification'
  ]
} as const

// All tool definitions
const ALL_TOOLS = [
  // Tasks
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level' },
          due_date: { type: 'string', description: 'Due date (e.g., "tomorrow", "2024-01-15", "Monday")' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update an existing task',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID' },
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          due_date: { type: 'string' },
          completed: { type: 'boolean' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete a task',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task as completed',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List tasks with optional filters',
      parameters: {
        type: 'object',
        properties: {
          completed: { type: 'boolean' },
          due_date: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_tasks',
      description: 'Search tasks by title',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number' },
        },
        required: ['query'],
      },
    },
  },
  // Habits
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description: 'Create a new habit',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Habit name' },
          description: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'custom'] },
          target_days: { type: 'array', items: { type: 'string' } },
          reminder_time: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_habit',
      description: 'Update an existing habit',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Habit ID' },
          name: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'custom'] },
          target_days: { type: 'array', items: { type: 'string' } },
          reminder_time: { type: 'string' },
          is_active: { type: 'boolean' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_habit',
      description: 'Delete a habit',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Habit ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_habit',
      description: 'Toggle habit completion for today',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Habit ID' },
          completed: { type: 'boolean', description: 'Whether habit is completed' },
        },
        required: ['id', 'completed'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_habit',
      description: 'Log habit completion (alias for toggle_habit)',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Habit ID' },
          completed: { type: 'boolean', description: 'Whether habit is completed' },
        },
        required: ['id', 'completed'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_habits',
      description: 'List habits with optional filters',
      parameters: {
        type: 'object',
        properties: {
          is_active: { type: 'boolean' },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'custom'] },
          limit: { type: 'number' },
        },
      },
    },
  },
  // Timetable
  {
    type: 'function',
    function: {
      name: 'create_timetable_slot',
      description: 'Create a new timetable slot',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Slot title' },
          type: { type: 'string', enum: ['class', 'study', 'exercise', 'sleep', 'meal', 'other'], description: 'Slot type' },
          date: { type: 'string', description: 'Date (e.g., "tomorrow", "2024-01-15", "Monday")' },
          start_time: { type: 'string', description: 'Start time (HH:MM)' },
          end_time: { type: 'string', description: 'End time (HH:MM)' },
          color: { type: 'string', description: 'Hex color code' },
          reference_id: { type: 'string', description: 'Reference to task/habit/exercise ID' },
        },
        required: ['title', 'date', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_timetable_slot',
      description: 'Update an existing timetable slot',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Slot ID' },
          title: { type: 'string' },
          type: { type: 'string', enum: ['class', 'study', 'exercise', 'sleep', 'meal', 'other'] },
          date: { type: 'string' },
          start_time: { type: 'string' },
          end_time: { type: 'string' },
          color: { type: 'string' },
          completed: { type: 'boolean' },
          reference_id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_timetable_slot',
      description: 'Delete a timetable slot',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Slot ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_timetable',
      description: 'List timetable slots with optional filters',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          type: { type: 'string', enum: ['class', 'study', 'exercise', 'sleep', 'meal', 'other'] },
          completed: { type: 'boolean' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'copy_timetable',
      description: 'Copy timetable from one date to another',
      parameters: {
        type: 'object',
        properties: {
          source_date: { type: 'string', description: 'Source date' },
          target_date: { type: 'string', description: 'Target date' },
          days: { type: 'number', description: 'Number of days to copy' },
        },
        required: ['source_date', 'target_date'],
      },
    },
  },
  // Exercise
  {
    type: 'function',
    function: {
      name: 'create_exercise',
      description: 'Create a new exercise',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Exercise name' },
          type: { type: 'string', enum: ['gym', 'cardio', 'yoga', 'sports', 'other'], description: 'Exercise type' },
          category: { type: 'string', description: 'Exercise category' },
          level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], description: 'Difficulty level' },
          description: { type: 'string', description: 'Exercise description' },
          duration_minutes: { type: 'number', description: 'Duration in minutes' },
          sets: { type: 'number', description: 'Number of sets' },
          reps: { type: 'number', description: 'Number of reps per set' },
          image_url: { type: 'string', description: 'Image URL' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_exercise',
      description: 'Update an existing exercise',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Exercise ID' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['gym', 'cardio', 'yoga', 'sports', 'other'] },
          category: { type: 'string' },
          level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          description: { type: 'string' },
          duration_minutes: { type: 'number' },
          sets: { type: 'number' },
          reps: { type: 'number' },
          image_url: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_exercise',
      description: 'Delete an exercise',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Exercise ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_exercise',
      description: 'Log an exercise session',
      parameters: {
        type: 'object',
        properties: {
          exercise_id: { type: 'string', description: 'Exercise ID' },
          date: { type: 'string', description: 'Date (e.g., "today", "2024-01-15")' },
          completed: { type: 'boolean', description: 'Whether exercise was completed' },
          duration_minutes: { type: 'number', description: 'Actual duration in minutes' },
          sets_completed: { type: 'number', description: 'Sets completed' },
          reps_completed: { type: 'number', description: 'Reps completed' },
          notes: { type: 'string', description: 'Notes about the session' },
        },
        required: ['exercise_id', 'completed'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_exercises',
      description: 'List exercises with optional filters',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['gym', 'cardio', 'yoga', 'sports', 'other'] },
          category: { type: 'string' },
          level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          limit: { type: 'number' },
        },
      },
    },
  },
  // Sleep
  {
    type: 'function',
    function: {
      name: 'create_sleep_log',
      description: 'Create a new sleep log',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date (e.g., "today", "2024-01-15")' },
          bed_time: { type: 'string', description: 'Bed time (HH:MM)' },
          wake_time: { type: 'string', description: 'Wake time (HH:MM)' },
          sleep_quality: { type: 'number', enum: [1, 2, 3, 4, 5], description: 'Sleep quality (1-5)' },
          notes: { type: 'string', description: 'Notes about sleep' },
        },
        required: ['date', 'bed_time', 'wake_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_sleep_log',
      description: 'Update an existing sleep log',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Sleep log ID' },
          date: { type: 'string' },
          bed_time: { type: 'string' },
          wake_time: { type: 'string' },
          sleep_quality: { type: 'number', enum: [1, 2, 3, 4, 5] },
          notes: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_sleep_log',
      description: 'Delete a sleep log',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Sleep log ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_sleep_logs',
      description: 'List sleep logs with optional filters',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
        },
      },
    },
  },
  // Analytics
  {
    type: 'function',
    function: {
      name: 'get_productivity_summary',
      description: 'Get productivity summary for the last 7 days',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_habit_summary',
      description: 'Get habit summary for a period',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['week', 'month'], description: 'Period for summary' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sleep_summary',
      description: 'Get sleep summary for a period',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['week', 'month'], description: 'Period for summary' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_daily_summary',
      description: 'Get daily summary for a specific date',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date (e.g., "today", "2024-01-15")' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weekly_summary',
      description: 'Get weekly summary for the last 7 days',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_data',
      description: 'Get dashboard data for today',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  // Notifications
  {
    type: 'function',
    function: {
      name: 'create_notification',
      description: 'Create a new notification',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Notification title' },
          content: { type: 'string', description: 'Notification content' },
          type: { type: 'string', enum: ['info', 'warning', 'success', 'error'], description: 'Notification type' },
          action_url: { type: 'string', description: 'Action URL' },
        },
        required: ['title'],
      },
    },
  },
  // Scheduling
  {
    type: 'function',
    function: {
      name: 'schedule_tasks',
      description: 'Generate a proposed schedule for tasks on a specific date. Returns a proposal that requires user confirmation before creating timetable entries.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date for scheduling (e.g., "tomorrow", "2024-01-15", "Monday")' },
          task_ids: { type: 'array', items: { type: 'string' }, description: 'Optional specific task IDs to schedule' },
          preferred_start: { type: 'string', description: 'Preferred start time (HH:MM)' },
          preferred_end: { type: 'string', description: 'Preferred end time (HH:MM)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_schedule_tasks',
      description: 'Confirm and create the proposed schedule from schedule_tasks. This actually creates the timetable slots in the database.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date for the schedule' },
          schedule: { type: 'array', items: { type: 'object' }, description: 'The proposed schedule array from schedule_tasks' },
        },
        required: ['date', 'schedule'],
      },
    },
  },
]

// ============================================
// Main handler
// ============================================

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are InnerLoop AI, a personal productivity assistant. You help users manage tasks, habits, timetables, exercise, sleep, and analytics.

You have access to various tools to interact with the user's data. Use them to help the user accomplish their goals.

Guidelines:
- Be concise and helpful
- Use tools when appropriate to perform actions
- Ask clarifying questions when needed
- Provide summaries after performing actions
- Prefer using tools over just describing what to do

Available tool groups: tasks, habits, timetable, exercise, sleep, analytics, notifications`

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    
    // Parse request body
    const { message, tool_groups } = await req.json()
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get Supabase client
    const supabase = getSupabaseClient(authHeader)
    
    // Get user from auth header
    let userId: string
    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      userId = user.id
    } else {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Determine which tools to include
    let toolsToInclude = ALL_TOOLS
    if (tool_groups && Array.isArray(tool_groups)) {
      const allowedToolNames = tool_groups.flatMap(group => TOOL_GROUPS[group as keyof typeof TOOL_GROUPS] || [])
      toolsToInclude = ALL_TOOLS.filter(tool => allowedToolNames.includes(tool.function.name))
    }

    // Prepare messages for LLM
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message }
    ]

    // Call LLM with tools
    let response = await callLLM(messages, toolsToInclude, 'auto')
    
    let toolResults: any[] = []
    let maxIterations = 5
    let iteration = 0

    // Handle tool calls
    while (response.choices[0].message.tool_calls && iteration < maxIterations) {
      iteration++
      const toolCalls = response.choices[0].message.tool_calls
      
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)
        
        // Find the tool implementation
        const toolImpl = (globalThis as any)[functionName]
        if (!toolImpl) {
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: `Tool ${functionName} not found` })
          })
          continue
        }

        try {
          const result = await toolImpl(supabase, functionArgs, userId)
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(result)
          })
        } catch (error) {
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: error.message })
          })
        }
      }

      // Add tool results to messages and call LLM again
      messages.push(response.choices[0].message)
      messages.push(...toolResults)
      toolResults = []
      
      response = await callLLM(messages, toolsToInclude, 'auto')
    }

    // Return final response
    return new Response(JSON.stringify({
      response: response.choices[0].message.content,
      tool_calls: response.choices[0].message.tool_calls || []
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})