-- Install trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for already-existing users
INSERT INTO public.profiles (id, first_name, last_name)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'first_name', split_part(COALESCE(u.email,''),'@',1)),
       COALESCE(u.raw_user_meta_data->>'last_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;