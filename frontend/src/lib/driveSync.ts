declare global {
  interface Window {
    google?: any;
  }
}

const BACKUP_FILENAME = "streakflow_snapshot.json";

export interface SyncState {
  isSignedIn: boolean;
  userEmail: string | null;
  lastSyncedAt: string | null;
}

class GoogleDriveSync {
  private tokenClient: any = null;
  private accessToken: string | null = null;

  initTokenClient(onSuccess: (token: string) => void) {
    if (typeof window === "undefined" || !window.google) return;

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      scope: "https://www.googleapis.com/auth/drive.appdata",
      callback: (resp: any) => {
        if (resp.error) {
          console.error("Auth error:", resp);
          return;
        }
        this.accessToken = resp.access_token;
        onSuccess(resp.access_token);
      },
    });
  }

  requestLogin() {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: "" });
    } else {
      console.error("Token client not initialized");
    }
  }

  // Find file in appDataFolder
  private async findBackupFileId(): Promise<string | null> {
    if (!this.accessToken) throw new Error("Not authenticated");

    const query = encodeURIComponent(`name = '${BACKUP_FILENAME}' and 'appDataFolder' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  }

  // Upload or overwrite backup JSON in appDataFolder
  async uploadSnapshot(payload: any): Promise<void> {
    if (!this.accessToken) throw new Error("Not authenticated");

    const existingFileId = await this.findBackupFileId();
    const fileContent = JSON.stringify(payload, null, 2);
    const blob = new Blob([fileContent], { type: "application/json" });

    if (existingFileId) {
      // Overwrite existing file
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: blob,
        }
      );
    } else {
      // Create new file in appDataFolder
      const metadata = {
        name: BACKUP_FILENAME,
        parents: ["appDataFolder"],
      };

      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      formData.append("file", blob);

      await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${this.accessToken}` },
          body: formData,
        }
      );
    }
  }

  // Restore payload from Google Drive
  async downloadSnapshot(): Promise<any> {
    if (!this.accessToken) throw new Error("Not authenticated");

    const fileId = await this.findBackupFileId();
    if (!fileId) return null;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    return await res.json();
  }
}

export const driveSync = new GoogleDriveSync();