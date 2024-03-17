// src/routes/auth/callback/+server.ts
import { supabase } from '$lib/server/supabaseClient.js';
import type { Config } from '@sveltejs/adapter-vercel';

export const config: Config = {
	runtime: 'nodejs18.x',
	maxDuration: 300
};

//TODO: Check for a session and if it's not present, redirect to the login page
export const POST = async ({ request }) => {
	// Get the request body
	const body = await request.json();

	console.log('Request body:', body);

	let response = request;

	// Task completed, return the response
	return new Response(JSON.stringify(response), {
		headers: { 'Content-Type': 'application/json' },
		status: 200
	});
};
