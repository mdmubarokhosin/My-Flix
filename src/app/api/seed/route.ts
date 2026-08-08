import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { DEFAULT_CATEGORIES } from '@/lib/types';
import { verifyAdmin } from '@/lib/auth';

export const runtime = 'edge';

const DEMO_VIDEOS = [
  { name: 'Jongli', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', img: '', amount: 0, time: '01:30:00', tag: 'Bangla, Action, Comedy', info: ['A demo movie - Big Buck Bunny.'] },
  { name: 'Meri Mummy Ki Dost S01', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', img: '', amount: 5, time: '00:45:00', tag: 'Hindi, Web Series, Comedy', info: ['A demo web series - Elephants Dream.'] },
  { name: 'Action Movie Demo', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', img: '', amount: 3, time: '00:15:00', tag: 'Action, Hindi', info: ['Action demo.'] },
  { name: 'Comedy Show', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', img: '', amount: 0, time: '00:20:00', tag: 'Comedy, Bangla', info: ['Comedy demo.'] },
  { name: 'Horror Night', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', img: '', amount: 5, time: '01:00:00', tag: 'Horror, Hindi', info: ['Horror demo.'] },
  { name: 'Romantic Story', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', img: '', amount: 2, time: '00:30:00', tag: 'Romantic, Hindi', info: ['Romance demo.'] },
  { name: 'Anime Episode 1', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', img: '', amount: 0, time: '00:25:00', tag: 'Anime, Action', info: ['Anime demo.'] },
  { name: 'Cartoon for Kids', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', img: '', amount: 0, time: '00:15:00', tag: 'Cartoon, Comedy', info: ['Cartoon demo.'] },
  { name: 'Drama Series S01', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', img: '', amount: 10, time: '00:35:00', tag: 'Web Series, Hindi, Drama', info: ['Drama demo.'] },
  { name: 'Thriller Movie', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', img: '', amount: 5, time: '02:00:00', tag: 'Hindi, Horror, Thriller', info: ['Thriller demo.'] },
  { name: 'Bangla Film', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', img: '', amount: 0, time: '01:45:00', tag: 'Bangla, Action', info: ['Bangla movie demo.'] },
  { name: 'Action Scene Comp', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', img: '', amount: 3, time: '00:10:00', tag: 'Action, Comedy', info: ['Action compilation.'] },
  { name: 'Romantic Bangla', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', img: '', amount: 2, time: '01:20:00', tag: 'Romantic, Bangla', info: ['Romantic Bangla movie.'] },
  { name: 'Anime Battle', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', img: '', amount: 0, time: '00:24:00', tag: 'Anime, Action', info: ['Anime battle.'] },
  { name: 'Comedy Bangla', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', img: '', amount: 0, time: '00:30:00', tag: 'Comedy, Bangla', info: ['Bangla comedy.'] },
  { name: 'Horror Bangla', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', img: '', amount: 5, time: '01:10:00', tag: 'Horror, Bangla', info: ['Bangla horror.'] },
  { name: 'Web Series S02', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', img: '', amount: 5, time: '00:40:00', tag: 'Web Series, Hindi, Comedy', info: ['Web series S02.'] },
  { name: 'Action Hindi', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', img: '', amount: 3, time: '02:15:00', tag: 'Action, Hindi', info: ['Hindi action movie.'] },
  { name: 'Drama Hindi', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', img: '', amount: 5, time: '01:50:00', tag: 'Hindi, Drama', info: ['Hindi drama.'] },
  { name: 'Anime Adventure', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', img: '', amount: 0, time: '00:20:00', tag: 'Anime, Comedy', info: ['Anime adventure.'] },
  { name: 'Cartoon Hindi', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', img: '', amount: 0, time: '00:25:00', tag: 'Cartoon, Hindi', info: ['Hindi cartoon.'] },
  { name: 'Bangla Web Series', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', img: '', amount: 3, time: '00:50:00', tag: 'Web Series, Bangla', info: ['Bangla web series.'] },
  { name: 'Hindi Horror', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', img: '', amount: 10, time: '01:30:00', tag: 'Horror, Hindi', info: ['Hindi horror movie.'] },
  { name: 'Romantic Hindi', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', img: '', amount: 2, time: '02:00:00', tag: 'Romantic, Hindi', info: ['Romantic Hindi movie.'] },
  { name: 'Action Web Series', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', img: '', amount: 5, time: '00:45:00', tag: 'Web Series, Action', info: ['Action web series.'] },
  { name: 'Comedy Hindi', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', img: '', amount: 0, time: '01:40:00', tag: 'Comedy, Hindi', info: ['Hindi comedy.'] },
  { name: 'Bangla Drama', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', img: '', amount: 3, time: '01:55:00', tag: 'Bangla, Drama', info: ['Bangla drama.'] },
  { name: 'Horror Web Series', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', img: '', amount: 5, time: '00:35:00', tag: 'Web Series, Horror', info: ['Horror web series.'] },
  { name: 'Anime Hindi', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', img: '', amount: 0, time: '00:22:00', tag: 'Anime, Hindi', info: ['Hindi anime.'] },
];

export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already seeded
    const existing = await db.get<Record<string, any>>('videos');
    if (existing && Object.keys(existing).length > 0) {
      return NextResponse.json({ message: 'Already seeded', count: Object.keys(existing).length });
    }

    // Preserve the existing admin password if settings already exist,
    // otherwise generate a random one and log a warning.
    const existingSettings = await db.get<Record<string, any>>('settings');
    let adminPassword: string;

    if (existingSettings?.adminPassword) {
      adminPassword = existingSettings.adminPassword;
    } else {
      // No existing settings — generate a secure random password
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      adminPassword = Array.from(arr, (b) => chars[b % chars.length]).join('');
      console.warn(
        `[seed] No existing admin password found. Generated a random password: ${adminPassword}. ` +
        'Change it immediately in Admin > Settings after first login.'
      );
    }

    // Seed categories in settings
    await db.set('settings', {
      ...existingSettings,
      categories: DEFAULT_CATEGORIES,
      adminPassword,
    });

    // Seed videos
    const videoIds: string[] = [];
    for (const v of DEMO_VIDEOS) {
      const id = db.generateId();
      await db.set(`videos/${id}`, {
        name: v.name,
        url: v.url,
        img: v.img,
        thumbnail: v.img,
        amount: v.amount,
        time: v.time,
        duration: v.time,
        tag: v.tag,
        tags: v.tag,
        info: v.info,
        createdAt: Date.now() + Math.random() * 86400000,
      });
      videoIds.push(id);
    }

    // Seed demo users
    await db.set('users/demo-user-1', {
      firstName: 'Demo',
      lastName: 'User 1',
      username: 'demo1',
      photoUrl: '',
      balance: 100,
      purchased: [videoIds[0], videoIds[2]],
      favorites: [videoIds[1], videoIds[3]],
      lastCheckIn: null,
      streak: 0,
      adWatchedToday: 0,
      lastAdDate: null,
      transactions: [{ type: 'gift', title: 'Welcome Bonus', amount: 100, time: Date.now() }],
      giftHistory: [],
      createdAt: Date.now(),
      theme: 'dark',
    });

    await db.set('users/demo-user-2', {
      firstName: 'Demo',
      lastName: 'User 2',
      username: 'demo2',
      photoUrl: '',
      balance: 50,
      purchased: [videoIds[5]],
      favorites: [videoIds[0], videoIds[4], videoIds[6]],
      lastCheckIn: new Date().toISOString().split('T')[0],
      streak: 3,
      adWatchedToday: 5,
      lastAdDate: new Date().toISOString().split('T')[0],
      transactions: [
        { type: 'gift', title: 'Welcome Bonus', amount: 50, time: Date.now() },
        { type: 'checkin', title: 'Daily Check-in (Day 3)', amount: 3, time: Date.now() - 86400000 },
      ],
      giftHistory: [],
      createdAt: Date.now() - 86400000,
      theme: 'dark',
    });

    // Seed demo gift codes
    await db.set('gifts/GIFT-WELCOM1', {
      amount: 100,
      package: 'Welcome Bonus',
      status: 'active',
      createdAt: Date.now(),
    });

    await db.set('gifts/GIFT-PREMIU1', {
      amount: 500,
      package: 'Premium Pack',
      status: 'active',
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      videos: DEMO_VIDEOS.length,
      categories: DEFAULT_CATEGORIES.length,
      users: 2,
      giftCodes: 2,
    });
  } catch (error) {
    console.error('POST /api/seed error:', error);
    return NextResponse.json({ error: 'Seed failed', details: String(error) }, { status: 500 });
  }
}