import { supabase } from './supabaseClient';

/**
 * Saves a completed analysis for the currently logged-in user.
 * Requires the `analyses` table + RLS policies from supabase/schema.sql.
 */
export async function saveAnalysis({ githubUsername, developerScore, analysisData, aiInsights }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('You must be logged in to save an analysis.');

  const { data, error } = await supabase
    .from('analyses')
    .insert({
      user_id: user.id,
      github_username: githubUsername,
      developer_score: developerScore,
      analysis_data: analysisData,
      ai_insights: aiInsights,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Returns the logged-in user's saved analyses, most recent first. */
export async function getAnalyses() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
