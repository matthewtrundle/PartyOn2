#!/bin/bash

# Script to organize media files for Party On Delivery website
# This script moves files from the public root directory to organized subdirectories

echo "Starting media organization for Party On Delivery..."

# Create directory structure if it doesn't exist
mkdir -p public/videos/hero
mkdir -p public/videos/backgrounds
mkdir -p public/images/hero
mkdir -p public/images/backgrounds
mkdir -p public/images/ai-assistant
mkdir -p public/images/services/weddings
mkdir -p public/images/services/bach-parties
mkdir -p public/images/services/boat-parties
mkdir -p public/images/services/corporate
mkdir -p public/images/services/fast-delivery
mkdir -p public/images/products
mkdir -p public/images/gallery
mkdir -p public/animations

# Move videos to appropriate folders
echo "Moving video files..."
mv public/social_biff01_A_cinematic_establishing_shot_of_Austins_vibrant_night_a572f3ef-7895-4d69-8bc7-96dfcaf7e6cb_3.mp4 public/videos/hero/austin-nightlife-cinematic.mp4 2>/dev/null
mv public/social_biff01_Austin_music_festival_crowd_going_wild_stage_lights_cr_073e551a-07a8-4bc6-a593-dfd47c0472d1_1.mp4 public/videos/hero/austin-music-festival.mp4 2>/dev/null
mv public/social_biff01_Glamorous_bachelorette_party_scene_in_upscale_Austin_r_bd869622-8524-400b-8569-77825b6f8a2a_0.mp4 public/videos/backgrounds/bachelorette-party-glamorous.mp4 2>/dev/null
mv public/social_biff01_High-energy_bachelor_party_scene_in_Austins_6th_Street_d6d9a224-d692-498f-971e-2e81a8f0bcb1_1.mp4 public/videos/backgrounds/bachelor-party-6th-street.mp4 2>/dev/null
mv public/social_biff01_High-energy_party_scene_in_modern_Austin_rooftop_bar_o_75fb604d-07ac-4522-8ba1-f5fda51e7ed8_1.mp4 public/videos/backgrounds/rooftop-party-austin.mp4 2>/dev/null

# Move hero images
echo "Moving hero images..."
mv public/biff01_Austin_skyline_at_golden_hour_from_Mount_Bonnell_viewp_70e449d9-34ee-4d92-89c9-7db7800d8f1f_3.png public/images/hero/austin-skyline-golden-hour.png 2>/dev/null
mv public/biff01_Neon-lit_Austin_6th_Street_at_night_vibrant_party_atmo_3117185a-bdab-453c-9ca8-675cd5581dc5_0.png public/images/hero/austin-6th-street-neon.png 2>/dev/null
mv public/biff01_Romantic_Lake_Travis_wedding_setup_at_sunset_golden_ho_1540ad76-0e75-421d-8c9e-f962f609ead8_0.png public/images/hero/lake-travis-wedding-sunset-1.png 2>/dev/null
mv public/biff01_Romantic_Lake_Travis_wedding_setup_at_sunset_golden_ho_1540ad76-0e75-421d-8c9e-f962f609ead8_1.png public/images/hero/lake-travis-wedding-sunset-2.png 2>/dev/null
mv public/biff01_Serene_Lake_Travis_sunset_luxury_yacht_with_subtle_wak_ccbb8429-d27a-4973-9f2d-fdff42c7a918_2.png public/images/hero/lake-travis-yacht-sunset.png 2>/dev/null
mv public/biff01_Ultra-luxury_mega_yacht_on_Lake_Travis_champagne_servi_fa0e75e3-6715-49dc-984b-2bac2b318280_1.png public/images/hero/luxury-mega-yacht.png 2>/dev/null
mv public/biff01_Ultra-luxury_wedding_at_Austin_estate_champagne_founta_9d977de7-3a93-4da3-b4af-d0ecb0449287_2.png public/images/hero/luxury-wedding-estate-1.png 2>/dev/null
mv public/biff01_Ultra-luxury_wedding_at_Austin_estate_champagne_founta_9d977de7-3a93-4da3-b4af-d0ecb0449287_3.png public/images/hero/luxury-wedding-estate-2.png 2>/dev/null

# Move background images
echo "Moving background images..."
mv public/biff01_golden_hour_sunlight_streaming_through_tree_leaves_dap_fd4d19c2-9d89-4d91-9be2-4ec6694f2955_0.png public/images/backgrounds/golden-hour-leaves.png 2>/dev/null
mv public/biff01_smooth_river_stones_stacked_in_perfect_balance_soft_na_534a15c2-4d6a-4e92-b69a-82f30568c026_0.png public/images/backgrounds/river-stones-balanced.png 2>/dev/null
mv public/biff01_soft_morning_light_filtering_through_sheer_curtains_in_9ec32c08-baac-47bf-847d-1295ebd1bb8f_1.png public/images/backgrounds/morning-light-curtains.png 2>/dev/null
mv public/biff01_close_up_of_gentle_ocean_waves_meeting_sand_soft_focus_e49af1cf-d1b2-4818-999e-ba1beff12d36_3.png public/images/backgrounds/ocean-waves-soft.png 2>/dev/null
mv public/biff01_time_lapse_style_image_of_a_flower_slowly_blooming_sof_78f1fa31-95db-4a62-b3c7-a95dc5138399_3.png public/images/backgrounds/flower-blooming-timelapse.png 2>/dev/null
mv public/biff01_Elegant_Austin_rooftop_terrace_setup_sophisticated_bac_5b384357-f265-4325-9c45-6bbb821c44ed_0.png public/images/backgrounds/rooftop-terrace-elegant-1.png 2>/dev/null
mv public/biff01_Elegant_Austin_rooftop_terrace_setup_sophisticated_bac_5b384357-f265-4325-9c45-6bbb821c44ed_3.png public/images/backgrounds/rooftop-terrace-elegant-2.png 2>/dev/null
mv public/biff01_Breathtaking_Lake_Travis_wedding_venue_outdoor_bar_set_ae76ee82-9457-4b77-bf56-5a4e904da181_3.png public/images/backgrounds/lake-travis-wedding-venue.png 2>/dev/null

# Move AI assistant images
echo "Moving AI assistant images..."
mv public/biff01_an_AI_bartender_wearing_a_comboy_hat_like_a_cowboy_who_9d615e7e-3a4c-405f-b2d7-c79648bd0534_3.png public/images/ai-assistant/biff-bartender-cowboy.png 2>/dev/null
mv public/biff01_Robot_cowboy_on_a_horse_in_the_distance_sunset_riding__99e3f999-6de0-404f-b661-519bbc8cd76b_2.png public/images/ai-assistant/robot-cowboy-horse-sunset.png 2>/dev/null

# Move wedding service images
echo "Moving wedding service images..."
mv public/biff01_Bohemian_outdoor_wedding_in_Texas_Hill_Country_rustic__a97138da-1d64-4d05-b84f-d49065b9a632_1.png public/images/services/weddings/boho-hill-country-1.png 2>/dev/null
mv public/biff01_Bohemian_outdoor_wedding_in_Texas_Hill_Country_rustic__a97138da-1d64-4d05-b84f-d49065b9a632_3.png public/images/services/weddings/boho-hill-country-2.png 2>/dev/null
mv public/biff01_Elegant_outdoor_wedding_bar_setup_on_Lake_Travis_hills_3445914e-3a85-4445-950a-bdee534f8e46_3.png public/images/services/weddings/outdoor-bar-setup-travis.png 2>/dev/null
mv public/biff01_Close-up_of_signature_cocktails_with_wedding_rings_art_ea2edd79-d09a-4c69-a4e6-50b7c478128d_3.png public/images/services/weddings/signature-cocktails-rings.png 2>/dev/null
mv public/biff01_Premium_spirits_display_at_hill_country_wedding_venue__59c515ff-aeea-4e21-800d-7881f9594235_2.png public/images/services/weddings/premium-spirits-display.png 2>/dev/null

# Move bach party service images
echo "Moving bach party service images..."
mv public/biff01_Elegant_brunch_mimosa_bar_setup_in_modern_Austin_hotel_1a728e99-9226-4243-a49e-54fcfbd2bcbd_3.png public/images/services/bach-parties/brunch-mimosa-bar.png 2>/dev/null
mv public/biff01_Late_night_party_supplies_artistically_arranged_premiu_230ef1d7-8c14-4f58-8c3e-070e6bdab45c_0.png public/images/services/bach-parties/late-night-supplies.png 2>/dev/null
mv public/biff01_Luxurious_bachelorette_party_setup_pink_champagne_towe_33e14893-1f0e-4daa-ba33-394e51ab1354_0.png public/images/services/bach-parties/bachelorette-champagne-tower.png 2>/dev/null
mv public/biff01_Epic_bachelor_party_chaos_red_and_orange_fire_effects__cb6de2d9-e1dc-4fc4-850b-3a17b52000a3_3.png public/images/services/bach-parties/bachelor-party-epic.png 2>/dev/null

# Move boat party service images
echo "Moving boat party service images..."
mv public/biff01_Captains_cooler_packed_with_premium_beverages_on_boat__1db8656d-5394-4da7-ab6d-4ebc7d20dfc1_3.png public/images/services/boat-parties/captains-cooler.png 2>/dev/null
mv public/biff01_Luxury_yacht_deck_on_Lake_Travis_with_premium_bar_setu_17a1c8f6-594e-440d-a221-990430d5a8a6_3.png public/images/services/boat-parties/luxury-yacht-deck.png 2>/dev/null
mv public/biff01_Epic_Lake_Travis_boat_party_multiple_yachts_rafted_tog_7534248b-464e-4fba-bb54-1e91e525b64f_3.png public/images/services/boat-parties/multiple-yachts-party.png 2>/dev/null
mv public/biff01_Sunset_champagne_setup_on_pontoon_boat_Veuve_Clicquot__dc3b2d2b-e76f-48b0-8ea0-a65df3b08fa4_0.png public/images/services/boat-parties/sunset-champagne-pontoon.png 2>/dev/null

# Move corporate service images
echo "Moving corporate service images..."
mv public/biff01_Upscale_hotel_penthouse_suite_setup_with_rose_gold_and_e8a6bcbb-8ee8-4669-8bcd-17ad83846689_3.png public/images/services/corporate/penthouse-suite-setup.png 2>/dev/null

# Move fast delivery service images
echo "Moving fast delivery service images..."
mv public/biff01_Motion-blurred_delivery_scene_at_upscale_Austin_home_e_26c9541d-53be-45fb-a00d-75d183debf6d_3.png public/images/services/fast-delivery/motion-blur-delivery.png 2>/dev/null
mv public/biff01_Speed-focused_composition_of_delivery_in_action_motion_90b25e1d-55a7-4039-a90f-6055205e2cdf_0.png public/images/services/fast-delivery/speed-delivery-action.png 2>/dev/null

# Move product images
echo "Moving product images..."
mv public/biff01_Branded_delivery_bag_contents_revealed_cold_craft_beer_0da013b7-1208-48d3-804a-55aced29a161_1.png public/images/products/branded-delivery-bag.png 2>/dev/null
mv public/biff01_Premium_spirits_boutique_display_wall_backlit_shelving_5baa6f20-84b3-4782-85b6-b1f67cd21989_0.png public/images/products/premium-spirits-wall.png 2>/dev/null

# Move gallery images
echo "Moving gallery images..."
mv public/biff01_Party_On_Delivery_headquarters_entrance_with_branded_s_97467009-3aea-42de-89e3-3eb5649d07b6_2.png public/images/gallery/headquarters-entrance.png 2>/dev/null
mv public/biff01_Futuristic_holographic_cocktail_menu_floating_in_space_c5cf6cd0-739f-4726-9486-dc1481eaa575_3.png public/images/gallery/holographic-cocktail-menu.png 2>/dev/null
mv public/biff01_Elegant_flat_lay_of_AI-recommended_party_setup_color-c_793b8f11-c0de-4d7e-b96a-d31ba418aa68_0.png public/images/gallery/ai-party-setup-flatlay.png 2>/dev/null

# Move animation images
echo "Moving animation images..."
mv public/biff01__energetic_particle_effects_pulsing_neon_lights_dynami_69a8d037-f25d-437b-801a-b5a87f039d5a_1.png public/animations/particle-effects-neon-1.png 2>/dev/null
mv public/biff01__energetic_particle_effects_pulsing_neon_lights_dynami_69a8d037-f25d-437b-801a-b5a87f039d5a_3.png public/animations/particle-effects-neon-2.png 2>/dev/null
mv public/biff01__gentle_champagne_bubbles_rising_soft_fabric_movement__2f493cd6-4cf7-4354-a9e0-de6799d4823e_0.png public/animations/champagne-bubbles-1.png 2>/dev/null
mv public/biff01__gentle_champagne_bubbles_rising_soft_fabric_movement__2f493cd6-4cf7-4354-a9e0-de6799d4823e_1.png public/animations/champagne-bubbles-2.png 2>/dev/null

# Remove duplicate file
echo "Removing duplicate files..."
rm -f public/biff01_Chic_Austin_Airbnb_living_room_transformed_for_celebra_a9c76659-2de6-4f6c-8472-58bf672cec01_3.png 2>/dev/null

echo "Media organization complete!"
echo ""
echo "Summary of organized files:"
echo "- Videos: Moved to /videos/hero and /videos/backgrounds"
echo "- AI Assistant Images: Moved to /images/ai-assistant"
echo "- Service Images: Organized by service type (weddings, bach-parties, boat-parties, etc.)"
echo "- Backgrounds: Moved to /images/backgrounds"
echo "- Products: Moved to /images/products"
echo "- Gallery: Moved to /images/gallery"
echo "- Animations: Moved to /animations"
echo ""
echo "All files have been renamed with descriptive, SEO-friendly names."