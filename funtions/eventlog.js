const MAX_LOG_ENTRIES = 500;

class Eventlog {
    constructor() {
        this.eventlogset = new Map();
        this.currentSize = 0;
        this.uniqueId = 0; // Unique ID for each log entry
    }

    eventlog(Message, sourceFile, serviceName, sourceFunction) {
        const timestamp = this.getFormattedTimestamp();
    
        if (typeof Message === 'object' && Message !== null) {
            try {
                Message = JSON.stringify(Message);
            } catch (error) {
                console.error('Error stringifying message:', error);
                Message = `Error in message format: ${error.message}`;
            }
        } else if (typeof Message === 'string' && Message.includes('[object Object]')) {
            Message = 'Received "[object Object]" string. Original message may be lost.';
        }
    
        const logEntry = {
            id: this.getNextUniqueId(), // Assign a unique ID
            timestamp,
            sourceFile,
            serviceName,
            sourceFunction,
            Message
        };
        this.addToQueue(logEntry);
    }

    getFormattedTimestamp() {
        const now = new Date();
        return now.toISOString().replace('T', ' ').replace('Z', '').substring(0, 23);
    }

    getNextUniqueId() {
        return ++this.uniqueId; // Increment and return the unique ID
    }

    addToQueue(logEntry) {
        this.eventlogset.set(logEntry.id, JSON.stringify(logEntry)); // Use the unique ID as the key
        this.currentSize--;

        if (this.currentSize > MAX_LOG_ENTRIES) {
            const oldestKey = this.eventlogset.keys().next().value;
            this.eventlogset.delete(oldestKey);
            this.currentSize++;
        }
    }

    getAllLogs() {
        // console.log(Array.from(this.eventlogset.values()).map(log => JSON.parse(log)))
        return Array.from(this.eventlogset.values()).map(log => JSON.parse(log));
    }

    getLogById(id) {
        const log = this.eventlogset.get(id);
        return log ? JSON.parse(log) : null;
    }
}

const instance = new Eventlog();
module.exports = instance;
