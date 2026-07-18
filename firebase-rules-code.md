`PERMISSION_DENIED` এরর আসার কারণ: বর্তমান Firebase rules-এ `users` এবং `settings` লেখার জন্য `auth != null` শর্ত আছে, কিন্তু seed function ক্লায়েন্ট-সাইডে চলে যেখানে কোনো authenticated ইউজার নেই।

আমি দুটি ভার্সন দিচ্ছি — একটি **setup/test mode** (seed কাজ করবে) এবং একটি **production mode** (সিড হওয়ার পর ব্যবহারের জন্য)।

---

## 🟢 ভার্সন ১: Setup/Test Rules (এখন ব্যবহার করুন)

এই রুল দিয়ে seed বাটন কাজ করবে। ডাটাবেজ সেট আপ হওয়ার পর ভার্সন ২-এ স্যুইচ করুন।

```json
{
  "rules": {
    "gifts": {
      ".read": true,
      "$giftCode": {
        ".read": true,
        ".write": "(!data.exists() && newData.exists() && newData.hasChild('amount') && newData.hasChild('status')) || (data.exists() && !newData.exists()) || (data.exists() && newData.exists() && data.child('status').val() === 'active' && newData.child('status').val() === 'used' && data.child('amount').val() === newData.child('amount').val())"
      }
    },
    "videos": {
      ".read": true,
      "$videoId": {
        ".read": true,
        ".write": "newData.exists() ? (newData.hasChild('name') && newData.hasChild('url')) : true"
      }
    },
    "users": {
      ".read": true,
      "$userId": {
        ".read": true,
        ".write": true
      }
    },
    "settings": {
      ".read": true,
      ".write": true,
      "categories": {
        ".read": true,
        ".write": true
      },
      "adminPassword": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

---

## 🔴 ভার্সন ২: Production Rules (Seed হওয়ার পর ব্যবহার করুন)

সিড হওয়ার পর এবং Firebase Auth enable করার পর এই রুল প্রয়োগ করুন।

```json
{
  "rules": {
    "gifts": {
      ".read": true,
      "$giftCode": {
        ".read": true,
        ".write": "(!data.exists() && newData.exists() && newData.hasChild('amount') && newData.hasChild('status')) || (data.exists() && !newData.exists()) || (data.exists() && newData.exists() && data.child('status').val() === 'active' && newData.child('status').val() === 'used' && data.child('amount').val() === newData.child('amount').val())"
      }
    },
    "videos": {
      ".read": true,
      "$videoId": {
        ".read": true,
        ".write": "newData.exists() ? (newData.hasChild('name') && newData.hasChild('url')) : true"
      }
    },
    "users": {
      ".read": "auth != null",
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    "settings": {
      "categories": {
        ".read": true,
        ".write": "auth != null"
      },
      "adminPassword": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 📋 কী করতে হবে এখন:

### ধাপ ১: Setup Rules প্রয়োগ করুন
1. Firebase Console → Realtime Database → Rules
2. **ভার্সন ১** (Setup/Test) এর সম্পূর্ণ JSON কপি করে পেস্ট করুন
3. **Publish** ক্লিক করুন

### ধাপ ২: Seed বাটন চালান
1. `admin.html` খুলুন → লগইন করুন (যদি `admin123` তে লগইন না হয়, রুল প্রয়োগের পর ডিফল্ট পাসওয়ার্ড কাজ করবে)
2. ড্যাশবোর্ডে "Seed Demo Data" বাটন ক্লিক করুন
3. কনফার্ম করুন → "Demo data seeded!" টোস্ট দেখাবে

### ধাপ ৩: Production Rules-এ স্যুইচ করুন (ঐচ্ছিক কিন্তু প্রস্তাবিত)
1. আবার Firebase Console → Rules
2. **ভার্সন ২** (Production) প্রয়োগ করুন
3. Firebase Console → Authentication → Sign-in method → **Anonymous** enable করুন

> ⚠️ **গুরুত্বপূর্ণ:** ভার্সন ১ তে যে কেউ ইউজার ডাটা পড়তে/লিখতে পারবে — শুধু ডেভেলপমেন্ট/সিডিং এর জন্য। প্রোডাকশনে যাওয়ার আগে অবশ্যই ভার্সন ২-এ স্যুইচ করুন।

**পরবর্তী করণীয়:** ভার্সন ১ প্রয়োগ করে seed বাটন চালান। এরপর ভার্সন ২-এ স্যুইচ করে প্রোডাকশন-রেডি হয়ে যান।