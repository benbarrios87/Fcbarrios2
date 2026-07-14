# Scoremodell

1. Kjør `supabase/migrations/007_score_models_and_engine.sql` i Supabase SQL Editor.
2. Kopier patchfilene inn i prosjektet.
3. Commit og push.
4. Åpne `/admin/scoring` som owner/admin.
5. Legg inn FC Barrios-matrisen og trykk Lagre.

Modellen støtter valgfritt antall tiers, gruppespill/sluttspill og egne verdier for riktig utfall, målforskjell og eksakt resultat. Poengmotoren gir bare poeng for beste treffkategori, slik FC Barrios allerede gjør.
