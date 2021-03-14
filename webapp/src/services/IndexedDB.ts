import { openDB, DBSchema } from 'idb';

export interface IPlaylist {
    "playlistId": string;
    "playlistLabel": string;
}

interface SpotifyDB extends DBSchema {
    playlists: {
        key: string;
        value: IPlaylist;
    };
    tracks: {
        key: string;
        value: IPlaylist[];
    };
}

export default class IndexedDBCtrl {
    private _db: any;
    async init(): Promise<void> {
        this._db = await openDB<SpotifyDB>('spotify-db', 1, {
            upgrade(db) {
                db.createObjectStore('playlists');
                db.createObjectStore('tracks');
            },
        });
    }
    async setPlaylistValue(playlistId: string, playlistValue: IPlaylist): Promise<void> {
        await this.init();
        this._db.put('playlists', playlistValue, playlistId);
    }
    async getPlaylistValue(playlistId: string): Promise<IPlaylist> {
        return this._db.get('playlists', playlistId) as IPlaylist;
    }
    async getPlaylistKey(playlistLabel: string): Promise<IPlaylist> {
        return this._db.get('playlists', playlistLabel) as IPlaylist;
    }
    async getAllPlaylists(): Promise<Array<IPlaylist>> {
        return this._db.getAll('playlists');
    }

    async setTrackValue(trackId: string, playlists: Array<IPlaylist>): Promise<void> {
        await this.init();
        this._db.put('tracks', playlists, trackId);
    }

    async getTrackValue(trackId: string): Promise<Array<IPlaylist>> {
        return this._db.get('tracks', trackId) as Array<IPlaylist>;
    }
}
