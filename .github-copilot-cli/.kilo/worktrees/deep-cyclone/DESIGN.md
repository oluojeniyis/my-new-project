---
name: TeesTale
description: An editorial fashion sourcebook for wholesale, retail, custom mesh, and accessories.
colors:
  pearl: "#F9FAFB"
  ink: "#111827"
  ink-soft: "#374151"
  secondary-copy: "#4B5563"
  divider: "#E5E7EB"
  divider-strong: "#D1D5DB"
  panel: "#F3F4F6"
  paper: "#FFFFFF"
  action-hover: "#1F2937"
  copy-muted: "#6B7280"
  disabled: "#9CA3AF"
typography:
  display:
    fontFamily: "Inter, system-ui, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(45px, 6vw, 82px)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.065em"
  body:
    fontFamily: "Inter, system-ui, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  labels:
    fontFamily: "Inter, system-ui, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "9px"
    fontWeight: 500
    letterSpacing: "0.12em"
  scale:
    micro: "6px"
    tiny: "7px"
    label: "8px"
    caption: "10px"
    body-small: "11px"
    body-medium: "12px"
    body-large: "13px"
    body: "14px"
    paragraph: "15px"
    lead: "16px"
    title-small: "17px"
    title: "18px"
    title-medium: "19px"
    title-large: "20px"
    heading-small: "22px"
    heading: "23px"
    heading-large: "25px"
    display-small: "26px"
    display-medium: "27px"
    display: "30px"
    display-large: "31px"
    display-xl: "32px"
    display-2xl: "33px"
    display-3xl: "34px"
    hero-small: "36px"
    hero-medium: "42px"
    hero-mobile: "43px"
    hero-mobile-wide: "48px"
    hero-desktop-small: "54px"
    hero-desktop: "55px"
    hero-large: "64px"
    hero-product: "72px"
rounded:
  circular: "50%"
components:
  primary-action:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    height: "48px"
    padding: "0 17px"
  product-image:
    aspectRatio: "3 / 4"
    backgroundColor: "{colors.panel}"
  divider:
    borderColor: "{colors.divider}"
---

# Design System: TeesTale

## Overview

**Creative North Star: The Editorial Sourcebook**

The storefront reads like a contemporary fashion catalog: calm navigation, generous portrait product imagery, sparse labels, and quick configuration that appears at the point of selection. It keeps the four product categories and sample-catalog caveat clear without implying verified photography, availability, pricing, or delivery.

## Color

Use a restrained neutral palette from `figma-tokens.txt`.

- **Pearl** (`#F9FAFB`): application background and quiet open space.
- **Ink** (`#111827`): primary type and high-priority actions.
- **Soft ink** (`#374151`) and secondary copy (`#4B5563`): supporting text.
- **Fine divider** (`#E5E7EB`): structural rules and option outlines.
- **Panel gray** (`#F3F4F6`): image grounds, hero support panels, and grouped content.
- **White** (`#FFFFFF`): navigation, overlay, and raised reading surfaces.
- **Action hover** (`#1F2937`): subtle hover state for primary actions.

Admin-uploaded catalog photographs lead. Until a product photo is added, use a neutral, clearly labeled photo-pending surface rather than invented product artwork. Images should not imply confirmed inventory, pricing, or fulfillment.

## Typography

**Typeface:** Inter with `system-ui` and system sans-serif fallbacks, used throughout for a quiet, modern editorial register. Use medium weights, compact tracking for display headlines, and small, letter-spaced category labels.

- **Hero display:** responsive 45–82px, medium weight, tight line-height and tracking.
- **Section headings:** responsive 30–48px, medium weight.
- **Product names:** 11–13px uppercase with restrained tracking.
- **Body:** 15px / 1.55; supporting copy 12–14px.
- **Metadata:** 9–10px, uppercase, tracked.

## Composition

- The shared navigation is a single pearl-white row with a quiet wordmark, centered collection links, and account/cart actions.
- The home hero uses a twelve-column editorial grid: a seven-column feature panel and two five-column category features stacked on the right.
- Product listings use borderless cards with a portrait `3 / 4` image frame, concise details below, and a slide-up configuration panel on hover or keyboard focus.
- Touch layouts keep quick controls visible without hover. The hero and category content stack or move into paired panels at narrow widths.
- Keep the collection navigation and visible sample catalog disclaimer discoverable.

## Components and interaction

### Navigation

Use the shared `SiteHeader` for all routes. Keep account state, sign-in feedback, order history, and the cart count available without crowding the collection links.

### Product cards

Use unboxed portrait image frames over `#F3F4F6`. Admin-uploaded catalog photos appear when present; otherwise show a neutral photo-pending state. Reveal size and color selections with a slide-up panel on pointer hover or focus-within; make the same panel available on touch devices. Use visible selected states and accessible names for each choice. Custom pieces link to their detail page for design notes.

### Controls

Use ink-filled primary actions, white or pearl surfaces, and fine neutral outlines. Keep keyboard focus visible. Hover must not be the only way to reveal options.

### Cart, checkout, and catalog truth

Preserve the existing local-storage cart line format and synchronization. The catalog is illustrative; do not fabricate prices, currency formatting, stock, wholesale minimums, or fulfillment promises. Continue to show unresolved price information accurately.

## Accessibility and motion

Use semantic navigation and buttons, live feedback for cart additions, `aria-pressed` for selected size/color, and keyboard focus as an equivalent to hover. Respect reduced-motion preferences for image scaling and overlay transitions.
