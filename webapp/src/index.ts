import Mustache from 'mustache';
import SpotifyWebApi from 'spotify-web-api-js';
import IndexedDBCtrl, { IPlaylist } from '../src/services/IndexedDB';

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
    <ul id='playlists'>
    </ul>
    `
    const htmlRecentlyListened = `
    <h2>Recently Listened</h2>
    <dl class="dl-horizontal">
    {{#items}}
      <dt>Song</dt><dd class="text-overflow">{{track.name}} by {{track.artists.0.name}}</dd>
      <dt>Played At</dt><dd class="text-overflow">{{played_at}}</dd>
    {{/items}}
    </dl>
    `
//<dt>Song</dt><dd class="text-overflow">{{track.name}} {{#track.artists}}by {{name}}{{/track.artists}}</dd>

    const spotifyApi = new SpotifyWebApi();

    const userProfileSource = (document.getElementById('user-profile') as HTMLElement);
    const params = getHashParams();
    console.debug(params);
    const access_token = params.access_token == null ? localStorage.getItem('spotify_accesstoken') : params.access_token;
    console.debug(access_token);
    const refresh_token = params.refresh_token;
    const error = params.error;
    console.debug(access_token);
    let userId = '';
    let trackId = '';
   
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
            userId = res.id;
            const output = Mustache.render(htmlUserProfile, res);
            userProfileSource.innerHTML = output;
            const loginDiv = (document.getElementById('login') as HTMLElement)
            loginDiv.classList.add('hidden');
            const loggedinDiv = (document.getElementById('loggedin') as HTMLElement)
            loggedinDiv.classList.remove('hidden');
        }    

      } else {
          // render initial screen
          const loginDiv = (document.getElementById('login') as HTMLElement)
          loginDiv.classList.remove('hidden');
          const loggedinDiv = (document.getElementById('loggedin') as HTMLElement)
          loggedinDiv.classList.add('hidden');
      }

      const nowPlaying = (document.getElementById('current-playing') as HTMLElement);
      nowPlaying.addEventListener('click', async function() {
        const access_token = localStorage.getItem('spotify_accesstoken');
        if(access_token){
            spotifyApi.setAccessToken(access_token);
            //getMyRecentlyPlayedTracks           
            spotifyApi.getMyCurrentPlayingTrack(async function (err: any, data: any) {
                if (err) JSON.stringify(err.response);
                else {
                    const replyTemplate = (document.getElementById('reply-template') as HTMLElement);
                    
                    const output = Mustache.render(htmlNowPlaying, data.item);
                    replyTemplate.innerHTML = output;
                    const currentlyPlayingTrackId = data.item.id;
                    const currentlyPlayingTrackUri = {
                      "uris" : [data.item.uri]
                    }
                    const spotifyDb = new IndexedDBCtrl();
                    await spotifyDb.init();
                    const playlistsCurrent = await spotifyDb.getTrackValue(currentlyPlayingTrackId);
                    const plMemberOf: IPlaylist[] = [];

                    playlistsCurrent?.forEach(async element => {
                      const plValue = await spotifyDb.getPlaylistValue(element.playlistId);
                      plMemberOf.push(plValue);
                    });

                    const playlistsAll: Array<IPlaylist> = await spotifyDb.getAllPlaylists();
                    const plContainer = document.getElementById('playlists') as HTMLElement;

                    playlistsAll.forEach(async (plValue, idx) => {
                      const plKey = await spotifyDb.getPlaylistKey(plValue.playlistId);
                      let selectedPl = '';
                      plMemberOf.forEach((value) => {
                        if(value.playlistId == plValue.playlistId) {
                          selectedPl = 'checked'
                        }
                      })

                      const rowDiv = document.createElement('li') as HTMLElement;
                      rowDiv.innerHTML = `
                          <input type='checkbox' name="playlist" data-id="${plKey.playlistId}" data-label="${plKey.playlistLabel}" ${selectedPl}>${plKey.playlistLabel}
                      `;
                      plContainer.append(rowDiv);

                      if(idx == playlistsAll.length -1 ) {
                        const liPlaylists = document.querySelectorAll("input[type='checkbox']") as NodeListOf<HTMLElement>;
                        liPlaylists.forEach((liPl) => {
                          liPl.addEventListener('click', async (e) => {
                              const el = e.target as HTMLInputElement;
                              const playlistId = el.getAttribute('data-id') as string;
                              const playlistLabel = el.getAttribute('data-label') as string;
                              const access_token = localStorage.getItem('spotify_accesstoken');
                              let TrackplayLists = await spotifyDb.getTrackValue(currentlyPlayingTrackId);
                              if(el.checked) {
                                console.log('add ' +  currentlyPlayingTrackUri.uris + ' to playlist ' + playlistId);
                                if(access_token){
                                    spotifyApi.setAccessToken(access_token);
                                    const res = await spotifyApi.addTracksToPlaylist(playlistId, currentlyPlayingTrackUri.uris);
                                    if(res.snapshot_id){
                                      //get the track from the idb
                                      if(!TrackplayLists) {
                                        spotifyDb.setTrackValue(currentlyPlayingTrackId, [{'playlistId' : playlistId, 'playlistLabel' : playlistLabel}] )
                                      } else {
                                        spotifyDb.setTrackValue(currentlyPlayingTrackId, TrackplayLists );
                                      }
                                      
                                    }
                                    //console.debug(res);
                                }
                              }else{
                                console.log('remove ' + currentlyPlayingTrackUri.uris + ' from playlist ' + playlistId);
                                if(access_token){
                                  spotifyApi.setAccessToken(access_token);
                                  const res = await spotifyApi.removeTracksFromPlaylist(playlistId, currentlyPlayingTrackUri.uris);
                                  if(res.snapshot_id){
                                    var filtered = TrackplayLists.filter(function(value, index, arr){ 
                                      return value.playlistId != playlistId;
                                    });
                                    spotifyDb.setTrackValue(currentlyPlayingTrackId, filtered )       
                                  }                                  
                                  // console.debug(res);
                                }
                              }
                              
                            });
                        });  
                      }
                    });                  
                }
            });                
        }
      }, false);

      const recentlyPlayed = (document.getElementById('recently-listened') as HTMLElement);
      recentlyPlayed.addEventListener('click', function() {
        const access_token = localStorage.getItem('spotify_accesstoken');
        if(access_token){
            spotifyApi.setAccessToken(access_token);
            spotifyApi.getMyRecentlyPlayedTracks(function (err: any, data: any) {
                if (err) JSON.stringify(err.response);
                else {
                    const replyTemplate = (document.getElementById('reply-template') as HTMLElement);

                    const output = Mustache.render(htmlRecentlyListened, data);
                    replyTemplate.innerHTML = output;
                    
                    // replyTemplate.innerHTML = JSON.stringify(data);
                    // var obj = JSON.parse(replyTemplate.innerText);
                    // replyTemplate.innerHTML = JSON.stringify(obj, undefined, 2);
                    // console.log('Currently Playing Track', JSON.stringify(data));
                }
                
              });   
        }
      }, false);

      const populatePlaylist = (document.getElementById('populate-playlist') as HTMLElement);
      populatePlaylist.addEventListener('click', function() {
        const access_token = localStorage.getItem('spotify_accesstoken');
        if(access_token){
            spotifyApi.setAccessToken(access_token);
            spotifyApi.getUserPlaylists(userId, function (err: any, dataPl: any) {
              if (err) JSON.stringify(err.response);
              else {
                const spotifyDb = new IndexedDBCtrl();
                for (const i in dataPl.items) {
                  //save playlist to db
                  const _playlist: IPlaylist = {
                    "playlistId": dataPl.items[i].id,
                    "playlistLabel": dataPl.items[i].name,
                  }
                  spotifyDb.setPlaylistValue(dataPl.items[i].id, _playlist )
                  populateDBFromPlaylist(access_token,_playlist,0);   
                }
              }
            });
        }
      }, false);
    }

    function populateDBFromPlaylist(token: string, pl: IPlaylist, _offset: number) {
      spotifyApi.setAccessToken(access_token);
      spotifyApi.getPlaylistTracks(pl.playlistId, {fields:'total,items(track.id)',offset:_offset, limit:100}, async function (err: any, dataPlTracks: any) {
          if (err) JSON.stringify(err.response);
          else {
              const spotifyDb = new IndexedDBCtrl();
              await spotifyDb.init();
              for (const j in dataPlTracks.items) {
                //Get Track from DB
                let TrackplayLists = await spotifyDb.getTrackValue(dataPlTracks.items[j].track.id);
                if(TrackplayLists == undefined){
                  // The track isnt found so we need to create it with this new playlist is has been added to
                  let playlist : Array<IPlaylist> = [pl];
                  spotifyDb.setTrackValue(dataPlTracks.items[j].track.id, playlist )
                } else{
                  // The tracks exists which means it has already been added to a playlist. Add the new playlist to the array and replay value
                  TrackplayLists.push(pl)                        
                  spotifyDb.setTrackValue(dataPlTracks.items[j].track.id, TrackplayLists )
                }
              }
              // check if there are any more tracks to process
              _offset += 100;
              if ( (dataPlTracks.total - _offset ) > 0 ) {
                populateDBFromPlaylist(token, pl,_offset );
              }
          }
        });
    }
  })();



