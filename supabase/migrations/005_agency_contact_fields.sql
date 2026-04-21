-- Migration 005: agency contact fields
-- Adds editable contact fields to agencies table

alter table agencies
  add column if not exists phone         text,
  add column if not exists contact_email text,
  add column if not exists address       text;
