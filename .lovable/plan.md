
# Add Scrollbar to Pages

## Problem
The Orders, Subscriptions, Delivery Agents, and Products pages don't have a visible scrollbar, making it hard to know there's more content below.

## Solution
Wrap the `<main>` content area in `Layout.tsx` with the existing `ScrollArea` component from the UI library. This gives all pages inside the layout a styled, visible scrollbar without modifying each page individually.

## Changes

### File: `src/components/Layout.tsx`
- Import the `ScrollArea` component
- Wrap the `<main>` element's content with `ScrollArea` so the main content area gets a visible vertical scrollbar
- Set the main area to use `overflow-hidden` and give `ScrollArea` full height so it controls scrolling

This is a single-file change that applies the scrollbar to all four pages (and any other pages using this layout).
