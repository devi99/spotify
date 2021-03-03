import Mustache from 'mustache';
import SpotifyWebApi from 'spotify-web-api-js';

(async function() {

    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
    function getHashParams() {
      let hashParams: any = {};
      let e, r = /([^&;=]+)=?([^&;]*)/g,
          q = window.location.hash.substring(1);
      while ( e = r.exec(q)) {
         hashParams[e[1]] = decodeURIComponent(e[2]);
      }
      return hashParams;
    }

    const htmlUserProfile = `
    <h1>Logged in as {{display_name}}</h1>
    <div class="media">
      <div class="pull-left">
        <img class="media-object" width="150" src="{{images.0.url}}" />
      </div>
      <div class="media-body">
        <dl class="dl-horizontal">
          <dt>Display name</dt><dd class="clearfix">{{display_name}}</dd>
          <dt>Id</dt><dd>{{id}}</dd>
          <dt>Email</dt><dd>{{email}}</dd>
          <dt>Spotify URI</dt><dd><a href="{{external_urls.spotify}}">{{external_urls.spotify}}</a></dd>
          <dt>Link</dt><dd><a href="{{href}}">{{href}}</a></dd>
          <dt>Profile Image</dt><dd class="clearfix"><a href="{{images.0.url}}">{{images.0.url}}</a></dd>
          <dt>Country</dt><dd>{{country}}</dd>
        </dl>
      </div>
    </div>
    `
    const htmlNowPlaying = `
    <h2>Now Playing</h2>
    <dl class="dl-horizontal">
      <dt>Song</dt><dd class="text-overflow">{{name}}</dd>
      {{#artists}}
        <dt>Artist</dt><dd class="text-overflow">{{name}}</dd>
      {{/artists}}
    </dl>
    `

    const spotifyApi = new SpotifyWebApi();

    const userProfileSource = (document.getElementById('user-profile') as HTMLElement);
    const params = getHashParams();
    console.debug(params);
    const access_token = params.access_token == null ? localStorage.getItem('spotify_accesstoken') : params.access_token;
    console.debug(access_token);
    const refresh_token = params.refresh_token;
    const error = params.error;
    console.debug(access_token);

    if (error) {
      //alert('There was an error during the authentication');
      window.location.href = <string>process.env.CALLBACK_URL + '/login'
    } else {
      if (access_token) {
        localStorage.setItem('spotify_accesstoken',access_token);
        localStorage.setItem('spotify_refreshtoken',refresh_token);
        const headers = new Headers();
        const bearer = `Bearer ${access_token}`;
        headers.append('Authorization', bearer);
        headers.append('Content-Type', 'application/json');
        const _options = {
            method: 'GET',
            headers: headers,
        };
        const response = await fetch('https://api.spotify.com/v1/me', _options);
        if (response.ok) {
            const res = await response.json();
            const output = Mustache.render(htmlUserProfile, res);
            userProfileSource.innerHTML = output;
            const loginDiv = (document.getElementById('login') as HTMLElement)
            loginDiv.classList.add('hidden');
            const loggedinDiv = (document.getElementById('loggedin') as HTMLElement)
            loggedinDiv.classList.remove('hidden');
        }    
        // spotifyApi.getArtistAlbums('43ZHCT0cAZBISjO8DG9PnE', function (err: any, data: any) {
        //     if (err) console.error(err);
        //     else console.log('Artist albums', data);
        //   });

      } else {
          // render initial screen
          const loginDiv = (document.getElementById('login') as HTMLElement)
          loginDiv.classList.remove('hidden');
          const loggedinDiv = (document.getElementById('loggedin') as HTMLElement)
          loggedinDiv.classList.add('hidden');
      }

      const nowPlaying = (document.getElementById('obtain-current-playing') as HTMLElement);
      nowPlaying.addEventListener('click', function() {
        const access_token = localStorage.getItem('spotify_accesstoken');
        if(access_token){
            spotifyApi.setAccessToken(access_token);
            //getMyRecentlyPlayedTracks
            //spotifyApi.getMyCurrentPlayingTrack(function (err: any, data: any) {
              spotifyApi.getMyRecentlyPlayedTracks(function (err: any, data: any) {
                if (err) JSON.stringify(err.response);
                else {
                    const replyTemplate = (document.getElementById('reply-template') as HTMLElement);
                    //const output = Mustache.render(htmlNowPlaying, data.item);
                    //replyTemplate.innerHTML = output;
                    replyTemplate.innerHTML = JSON.stringify(data);
                    var obj = JSON.parse(replyTemplate.innerText);
                    replyTemplate.innerHTML = JSON.stringify(obj, undefined, 2);
                    //console.log('Currently Playing Track', JSON.stringify(data));
                }
                
              });   
        }

      }, false);
    
    }
  })();
