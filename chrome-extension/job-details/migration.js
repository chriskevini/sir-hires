// Migration service for upgrading storage schema versions
// Handles migration from v0.1.0 (old status names) to v0.2.0 (new status names)

export class MigrationService {
  constructor(storage) {
    this.storage = storage;
    this.currentVersion = 2; // v0.2.0
  }

  /**
   * Status mapping from v0.1.0 to v0.2.0
   * OLD (v0.1.0) → NEW (v0.2.0)
   */
  statusMigrationMap = {
    'Saved': 'Researching',          // Initial state: researching the job
    'Drafting': 'Drafting',          // No change
    'Applied': 'Awaiting Review',    // Waiting for employer response
    'Screening': 'Interviewing',     // Merge screening into interviewing
    'Interviewing': 'Interviewing',  // No change
    'Offer': 'Deciding',             // Deciding on offer
    'Accepted': 'Accepted',          // No change (terminal)
    'Rejected': 'Rejected',          // No change (terminal)
    'Withdrawn': 'Withdrawn'         // No change (terminal)
  };

  /**
   * Check current data version and run migrations if needed
   * This is the main entry point called during app initialization
   */
  async checkAndMigrate() {
    try {
      const result = await chrome.storage.local.get('dataVersion');
      const currentDataVersion = result.dataVersion || 1;

      console.log(`Current data version: ${currentDataVersion}`);

      if (currentDataVersion < this.currentVersion) {
        console.log(`Migration needed: v${currentDataVersion} → v${this.currentVersion}`);
        await this.runMigrations(currentDataVersion);
        console.log('Migration completed successfully');
      } else {
        console.log('Data is up to date, no migration needed');
      }
    } catch (error) {
      console.error('Migration check failed:', error);
      throw error;
    }
  }

  /**
   * Run all necessary migrations from old version to current version
   * @param {number} fromVersion - Starting version number
   */
  async runMigrations(fromVersion) {
    // Migration from v1 to v2
    if (fromVersion < 2) {
      await this.migrateV1ToV2();
    }

    // Future migrations would go here
    // if (fromVersion < 3) { await this.migrateV2ToV3(); }
  }

  /**
   * Migrate from v0.1.0 (version 1) to v0.2.0 (version 2)
   * Changes: Status name updates throughout job data
   */
  async migrateV1ToV2() {
    console.log('Starting migration v1 → v2 (status name updates)...');

    try {
      // Load all jobs from storage
      const jobs = await this.storage.getAllJobs();
      console.log(`Found ${jobs.length} jobs to migrate`);

      if (jobs.length === 0) {
        console.log('No jobs to migrate, marking version as updated');
        await chrome.storage.local.set({ dataVersion: 2 });
        return;
      }

      // Migrate each job
      const migratedJobs = jobs.map((job, index) => {
        console.log(`Migrating job ${index + 1}/${jobs.length}: ${job.jobTitle || 'Untitled'}`);
        return this.migrateJobToV2(job);
      });

      // Save migrated jobs back to storage
      await this.storage.saveAllJobs(migratedJobs);

      // Mark migration as complete
      await chrome.storage.local.set({ dataVersion: 2 });

      console.log(`Migration v1 → v2 complete: ${migratedJobs.length} jobs migrated`);
    } catch (error) {
      console.error('Migration v1 → v2 failed:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Migrate a single job object from v1 to v2 schema
   * @param {Object} job - Job object to migrate
   * @returns {Object} Migrated job object
   */
  migrateJobToV2(job) {
    const migratedJob = { ...job };

    // Migrate current applicationStatus
    if (migratedJob.applicationStatus) {
      const oldStatus = migratedJob.applicationStatus;
      const newStatus = this.statusMigrationMap[oldStatus];

      if (newStatus) {
        migratedJob.applicationStatus = newStatus;
        console.log(`  Status: ${oldStatus} → ${newStatus}`);
      } else {
        // Unknown status, default to Researching
        console.warn(`  Unknown status "${oldStatus}", defaulting to "Researching"`);
        migratedJob.applicationStatus = 'Researching';
      }
    } else {
      // No status set, default to Researching
      migratedJob.applicationStatus = 'Researching';
    }

    // Migrate statusHistory array
    if (migratedJob.statusHistory && Array.isArray(migratedJob.statusHistory)) {
      migratedJob.statusHistory = migratedJob.statusHistory.map(entry => {
        const oldStatus = entry.status;
        const newStatus = this.statusMigrationMap[oldStatus] || oldStatus;

        return {
          ...entry,
          status: newStatus
        };
      });
      console.log(`  Migrated ${migratedJob.statusHistory.length} status history entries`);
    } else {
      // Initialize status history if missing
      migratedJob.statusHistory = [{
        status: migratedJob.applicationStatus,
        date: migratedJob.updatedAt || new Date().toISOString()
      }];
    }

    // Ensure job has an ID (should already exist from earlier refactor)
    if (!migratedJob.id) {
      migratedJob.id = this.storage.generateId();
      console.log(`  Added missing ID: ${migratedJob.id}`);
    }

    return migratedJob;
  }

  /**
   * Get the current data version from storage
   * @returns {Promise<number>} Current data version
   */
  async getCurrentVersion() {
    const result = await chrome.storage.local.get('dataVersion');
    return result.dataVersion || 1;
  }

  /**
   * Force set data version (use with caution, mainly for testing)
   * @param {number} version - Version number to set
   */
  async setVersion(version) {
    await chrome.storage.local.set({ dataVersion: version });
    console.log(`Data version set to ${version}`);
  }
}
