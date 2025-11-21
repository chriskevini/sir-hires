/**
 * Unit tests for StorageService
 * 
 * Demonstrates testing patterns for Chrome storage operations
 */

describe('StorageService', () => {
  let mockChromeStorage

  beforeEach(() => {
    // Mock chrome.storage.local
    mockChromeStorage = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    }

    global.chrome = {
      storage: {
        local: mockChromeStorage,
      },
      runtime: {
        lastError: undefined,
      },
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('saveJob', () => {
    it('should save a job to storage', async () => {
      const mockJob = {
        id: 'job_123',
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
      }

      mockChromeStorage.get.mockImplementation((keys, callback) => {
        callback({ jobs: {} })
      })

      mockChromeStorage.set.mockImplementation((data, callback) => {
        callback()
      })

      await saveJob(mockJob)

      expect(mockChromeStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          jobs: expect.objectContaining({
            job_123: mockJob,
          }),
        }),
        expect.any(Function)
      )
    })

    it('should update existing job in storage', async () => {
      const existingJob = {
        id: 'job_123',
        jobTitle: 'Software Engineer',
        company: 'Old Corp',
      }

      const updatedJob = {
        id: 'job_123',
        jobTitle: 'Senior Software Engineer',
        company: 'New Corp',
      }

      mockChromeStorage.get.mockImplementation((keys, callback) => {
        callback({ jobs: { job_123: existingJob } })
      })

      mockChromeStorage.set.mockImplementation((data, callback) => {
        callback()
      })

      await saveJob(updatedJob)

      expect(mockChromeStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          jobs: expect.objectContaining({
            job_123: updatedJob,
          }),
        }),
        expect.any(Function)
      )
    })
  })

  describe('loadJob', () => {
    it('should load a job from storage', async () => {
      const mockJob = {
        id: 'job_123',
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
      }

      mockChromeStorage.get.mockImplementation((keys, callback) => {
        callback({ jobs: { job_123: mockJob } })
      })

      const result = await loadJob('job_123')

      expect(result).toEqual(mockJob)
      expect(mockChromeStorage.get).toHaveBeenCalledWith(['jobs'], expect.any(Function))
    })

    it('should return null for non-existent job', async () => {
      mockChromeStorage.get.mockImplementation((keys, callback) => {
        callback({ jobs: {} })
      })

      const result = await loadJob('job_999')

      expect(result).toBeNull()
    })
  })

  describe('deleteJob', () => {
    it('should remove a job from storage', async () => {
      const mockJobs = {
        job_123: { id: 'job_123', jobTitle: 'Engineer' },
        job_456: { id: 'job_456', jobTitle: 'Designer' },
      }

      mockChromeStorage.get.mockImplementation((keys, callback) => {
        callback({ jobs: mockJobs })
      })

      mockChromeStorage.set.mockImplementation((data, callback) => {
        callback()
      })

      await deleteJob('job_123')

      expect(mockChromeStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          jobs: expect.not.objectContaining({
            job_123: expect.anything(),
          }),
        }),
        expect.any(Function)
      )
    })
  })
})

/**
 * Helper functions for tests
 * These simulate the storage operations from the actual codebase
 */

function saveJob(job) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['jobs'], (result) => {
      const jobs = result.jobs || {}
      jobs[job.id] = job

      chrome.storage.local.set({ jobs }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  })
}

function loadJob(jobId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['jobs'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        const jobs = result.jobs || {}
        resolve(jobs[jobId] || null)
      }
    })
  })
}

function deleteJob(jobId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['jobs'], (result) => {
      const jobs = result.jobs || {}
      delete jobs[jobId]

      chrome.storage.local.set({ jobs }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  })
}
