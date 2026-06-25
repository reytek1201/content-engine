-- Add confident voice persona for a second female narration option.

ALTER TABLE public.brands
  DROP CONSTRAINT IF EXISTS brands_preferred_voice_persona_check;

ALTER TABLE public.brands
  ADD CONSTRAINT brands_preferred_voice_persona_check
  CHECK (
    preferred_voice_persona IS NULL
    OR preferred_voice_persona IN (
      'warm',
      'confident',
      'energetic',
      'professional'
    )
  );
