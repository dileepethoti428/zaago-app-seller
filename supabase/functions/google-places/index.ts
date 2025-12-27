import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, ...params } = body;
    
    console.log('📍 Google Places request received:', { type, params: Object.keys(params) });
    
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!apiKey) {
      console.error('❌ GOOGLE_PLACES_API_KEY not configured');
      throw new Error('Google Places API key not configured');
    }

    if (!type) {
      console.error('❌ Missing request type in body:', body);
      throw new Error('Missing request type. Expected: reverse_geocode, place_autocomplete, place_details, or nearby_search');
    }

    let url: string;
    let response: Response;

    switch (type) {
      case 'reverse_geocode':
        // Reverse geocoding to get address from coordinates
        url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${params.lat},${params.lng}&key=${apiKey}`;
        response = await fetch(url);
        break;
      
      case 'place_autocomplete':
        // Places autocomplete for search suggestions
        url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(params.input)}&types=address&key=${apiKey}`;
        if (params.location) {
          url += `&location=${params.location}&radius=50000`;
        }
        response = await fetch(url);
        break;
      
      case 'place_details':
        // Get place details including coordinates
        url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${params.place_id}&fields=geometry,formatted_address,address_components&key=${apiKey}`;
        response = await fetch(url);
        break;
      
      case 'nearby_search':
        // Search for places nearby
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${params.lat},${params.lng}&radius=${params.radius || 1000}&type=${params.placeType || 'establishment'}&key=${apiKey}`;
        response = await fetch(url);
        break;
      
      default:
        console.error('❌ Invalid request type:', type);
        throw new Error(`Invalid request type: "${type}". Expected: reverse_geocode, place_autocomplete, place_details, or nearby_search`);
    }

    const data = await response.json();
    
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Google Places API error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        status: 'ERROR'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});