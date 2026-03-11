create or replace function public.cascade_delete_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  kitchen_record record;
begin
  delete from public.kitchen_invitations
  where invited_by = p_user_id
     or accepted_by = p_user_id;

  update public.alerts
     set created_by = null
   where created_by = p_user_id;

  update public.inventory
     set created_by = null
   where created_by = p_user_id;

  update public.items
     set created_by = null
   where created_by = p_user_id;

  update public.kitchen_members
     set invited_by = null,
         created_by = null
   where invited_by = p_user_id
      or created_by = p_user_id;

  update public.kitchens
     set created_by = null
   where created_by = p_user_id;

  update public.receipts
     set created_by = null
   where created_by = p_user_id;

  delete from public.kitchen_members
  where user_id = p_user_id;

  for kitchen_record in
    select id
      from public.kitchens
     where owner_id = p_user_id
  loop
    update public.user_preferences
       set default_kitchen_id = null
     where default_kitchen_id = kitchen_record.id
       and user_id <> p_user_id;

    update public.receipt_items
       set item_id = null
     where item_id in (
       select id from public.items where kitchen_id = kitchen_record.id
     );

    update public.receipt_items
       set matched_item_id = null
     where matched_item_id in (
       select id from public.items where kitchen_id = kitchen_record.id
     );

    delete from public.alerts
    where kitchen_id = kitchen_record.id;

    delete from public.inventory
    where kitchen_id = kitchen_record.id;

    delete from public.items
    where kitchen_id = kitchen_record.id;

    delete from public.receipt_items
    using public.receipts r
    where receipt_items.receipt_id = r.id
      and r.kitchen_id = kitchen_record.id;

    delete from public.receipts
    where kitchen_id = kitchen_record.id;

    delete from public.locations
    where kitchen_id = kitchen_record.id;

    delete from public.kitchen_members
    where kitchen_id = kitchen_record.id;

    delete from public.kitchen_invitations
    where kitchen_id = kitchen_record.id;

    delete from public.kitchens
    where id = kitchen_record.id;
  end loop;

  delete from public.user_preferences
  where user_id = p_user_id;
end;
$$;
;
