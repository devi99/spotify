import * as dotenv from "dotenv";
import express from 'express';
import path from 'path';
import querystring from 'querystring';
import request from 'request';
import cookieParser from 'cookie-parser';

console.log('start running');
//dotenv.config({ path: __dirname + '/.env' });
dotenv.config();
// const result = dotenv.config();
// console.log(result);

global.spotConfig = 'maybe keep accesstokens persistent';

const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = process.env.HOST + '/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function(length: number) {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
	for (let i = 0; i < length; i++) {
	  text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
  };

const stateKey = 'spotify_auth_state';

const apiRoutes = require('./routes/api');
const app = express(),
            DIST_DIR = path.join(__dirname, '../../webapp/dist'),
            HTML_FILE = path.join(DIST_DIR, 'index.html');
app.use(express.static(DIST_DIR));
app.use(cookieParser());

app.get('/login', function(req, res) {

	const state = generateRandomString(16);
	res.cookie(stateKey, state);
  
	// your application requests authorization
	const scope = 'user-read-private user-read-email user-read-playback-state user-read-recently-played playlist-modify-private playlist-modify-public';
	res.redirect('https://accounts.spotify.com/authorize?' +
	  querystring.stringify({
		response_type: 'code',
		client_id: client_id,
		scope: scope,
		redirect_uri: redirect_uri,
		state: state
	  }));
});

app.get('/callback', function(req, res) {

	// your application requests refresh and access tokens
	// after checking the state parameter
  
	var code = req.query.code || null;
	var state = req.query.state || null;
	var storedState = req.cookies ? req.cookies[stateKey] : null;
  
	if (state === null || state !== storedState) {
	  res.redirect('/#' +
		querystring.stringify({
		  error: 'state_mismatch'
		}));
	} else {
	  res.clearCookie(stateKey);
	  var authOptions = {
		url: 'https://accounts.spotify.com/api/token',
		form: {
		  code: code,
		  redirect_uri: redirect_uri,
		  grant_type: 'authorization_code'
		},
		headers: {
		  'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
		},
		json: true
	  };
  
	  request.post(authOptions, function(error, response, body) {
		if (!error && response.statusCode === 200) {
  
			//res.cookie('spotify_token', body);

		  	var access_token = body.access_token,
			  refresh_token = body.refresh_token;
  
		  var options = {
			url: 'https://api.spotify.com/v1/me',
			headers: { 'Authorization': 'Bearer ' + access_token },
			json: true
		  };
  
		  // use the access token to access the Spotify Web API
		  request.get(options, function(error, response, body) {
			console.log(body);
		  });
  
		  // we can also pass the token to the browser to make requests from there
		  res.redirect('/#' +
			querystring.stringify({
			  access_token: access_token,
			  refresh_token: refresh_token
			}));
		} else {
		  res.redirect('/#' +
			querystring.stringify({
			  error: 'invalid_token'
			}));
		}
	  });
	}
});
  
app.get('/refresh_token', function(req, res) {
  
	// requesting access token from refresh token
	var refresh_token = req.query.refresh_token;
	var authOptions = {
	  url: 'https://accounts.spotify.com/api/token',
	  headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
	  form: {
		grant_type: 'refresh_token',
		refresh_token: refresh_token
	  },
	  json: true
	};
  
	request.post(authOptions, function(error, response, body) {
	  if (!error && response.statusCode === 200) {
		var access_token = body.access_token;
		res.send({
		  'access_token': access_token
		});
	  }
	});
});

app.use('/api', apiRoutes);
app.get('*', (req, res) => {
    res.sendFile(HTML_FILE)
});

const PORT = process.env.PORT || 8888
app.listen(PORT, () => console.log(`App listening to ${PORT}....`))
