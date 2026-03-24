import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, afterNextRender, signal, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { animate, stagger } from 'motion';
import { db, auth } from './firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

interface Message {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  createdAt: any;
}

interface ThemeColor {
  name: string;
  bgClass: string;
  textClass: string;
  ringClass: string;
  placeholderClass: string;
  borderClass: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  @ViewChild('title') titleRef!: ElementRef<HTMLHeadingElement>;
  @ViewChild('mainContent') mainContentRef!: ElementRef<HTMLDivElement>;

  titleText = 'Global rdis chat'.split('');

  colors: ThemeColor[] = [
    { name: 'White', bgClass: 'bg-zinc-100', textClass: 'text-zinc-100', ringClass: 'ring-zinc-100/50', placeholderClass: 'placeholder-zinc-100/50', borderClass: 'border-zinc-100/20' },
    { name: 'Black', bgClass: 'bg-zinc-800', textClass: 'text-zinc-400', ringClass: 'ring-zinc-800/50', placeholderClass: 'placeholder-zinc-600/50', borderClass: 'border-zinc-800/50' },
    { name: 'Neon', bgClass: 'bg-cyan-400', textClass: 'text-cyan-400', ringClass: 'ring-cyan-400/50', placeholderClass: 'placeholder-cyan-400/50', borderClass: 'border-cyan-400/20' },
    { name: 'Rainbow', bgClass: 'bg-gradient-to-tr from-red-500 via-yellow-500 to-blue-500', textClass: 'text-white', ringClass: 'ring-white/50', placeholderClass: 'placeholder-white/50', borderClass: 'border-white/20' },
    { name: 'Blue', bgClass: 'bg-blue-500', textClass: 'text-blue-400', ringClass: 'ring-blue-500/50', placeholderClass: 'placeholder-blue-400/50', borderClass: 'border-blue-500/20' },
    { name: 'Emerald', bgClass: 'bg-emerald-500', textClass: 'text-emerald-400', ringClass: 'ring-emerald-500/50', placeholderClass: 'placeholder-emerald-400/50', borderClass: 'border-emerald-500/20' },
    { name: 'Violet', bgClass: 'bg-violet-500', textClass: 'text-violet-400', ringClass: 'ring-violet-500/50', placeholderClass: 'placeholder-violet-400/50', borderClass: 'border-violet-500/20' },
    { name: 'Rose', bgClass: 'bg-rose-500', textClass: 'text-rose-400', ringClass: 'ring-rose-500/50', placeholderClass: 'placeholder-rose-400/50', borderClass: 'border-rose-500/20' },
    { name: 'Amber', bgClass: 'bg-amber-500', textClass: 'text-amber-400', ringClass: 'ring-amber-500/50', placeholderClass: 'placeholder-amber-400/50', borderClass: 'border-amber-500/20' },
  ];

  selectedColor = signal<ThemeColor>(this.colors[0]);
  isColorPickerOpen = signal<boolean>(false);
  activeTab = signal<'home' | 'messages' | 'profile' | 'communities' | 'settings'>('home');
  isMenuOpen = signal<boolean>(false);

  currentUser = signal<User | null>(null);
  isAuthReady = signal<boolean>(false);
  messages = signal<Message[]>([]);
  newMessageText = signal<string>('');

  constructor() {
    effect((onCleanup) => {
      if (this.isAuthReady() && this.currentUser()) {
        const messagesRef = collection(db, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Message[];
          this.messages.set(msgs);
        }, (error) => {
          console.error("Error fetching messages:", error);
        });

        onCleanup(() => unsubscribe());
      }
    });

    onAuthStateChanged(auth, (user) => {
      this.currentUser.set(user);
      this.isAuthReady.set(true);
    });
    afterNextRender(() => {
      if (this.mainContentRef) {
        animate(
          this.mainContentRef.nativeElement,
          { opacity: [0, 1], y: [30, 0] },
          { duration: 0.8, ease: 'easeOut' }
        );
      }

      // Load saved color from localStorage
      const savedColorName = localStorage.getItem('theme-color');
      if (savedColorName) {
        const savedColor = this.colors.find(c => c.name === savedColorName);
        if (savedColor) {
          this.selectedColor.set(savedColor);
        }
      }

      if (this.titleRef) {
        const spans = this.titleRef.nativeElement.querySelectorAll('span');
        
        // Initial entrance animation for characters
        animate(
          spans as any,
          { y: [20, 0], opacity: [0, 1], scale: [0.5, 1] },
          { delay: stagger(0.05), duration: 0.6, ease: 'easeOut' }
        );

        // Continuous floating animation for the whole title
        animate(
          this.titleRef.nativeElement as any,
          { y: [-8, 8] },
          { duration: 2.5, repeatType: "reverse", repeat: Infinity, ease: "easeInOut" }
        );
      }
    });
  }

  selectColor(color: ThemeColor) {
    this.selectedColor.set(color);
    localStorage.setItem('theme-color', color.name);
  }

  selectTab(tab: 'home' | 'messages' | 'profile' | 'communities' | 'settings') {
    this.activeTab.set(tab);
    this.isMenuOpen.set(false);
  }

  async login() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  }

  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  updateNewMessageText(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newMessageText.set(input.value);
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async sendMessage() {
    const text = this.newMessageText().trim();
    const user = this.currentUser();
    
    if (!text || !user) return;

    try {
      this.newMessageText.set(''); // Optimistic clear
      
      await addDoc(collection(db, 'messages'), {
        text,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
      // Revert optimistic clear on error
      this.newMessageText.set(text);
    }
  }
}
