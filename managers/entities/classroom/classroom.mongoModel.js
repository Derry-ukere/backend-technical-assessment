const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Classroom name is required'],
        trim: true,
        minlength: [1, 'Classroom name must be at least 1 character'],
        maxlength: [100, 'Classroom name cannot exceed 100 characters']
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required']
    },
    capacity: {
        type: Number,
        required: [true, 'Capacity is required'],
        min: [1, 'Capacity must be at least 1'],
        max: [500, 'Capacity cannot exceed 500']
    },
    grade: {
        type: String,
        trim: true,
        maxlength: [50, 'Grade cannot exceed 50 characters']
    },
    section: {
        type: String,
        trim: true,
        maxlength: [20, 'Section cannot exceed 20 characters']
    },
    resources: [{
        type: String,
        trim: true
    }],
    academicYear: {
        type: String,
        trim: true,
        match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator reference is required']
    }
}, {
    timestamps: true
});

// Compound index for unique classroom name within a school
classroomSchema.index({ name: 1, schoolId: 1, academicYear: 1 }, { unique: true });
classroomSchema.index({ schoolId: 1 });
classroomSchema.index({ isActive: 1 });
classroomSchema.index({ grade: 1, section: 1 });

// Virtual for getting student count in classroom
classroomSchema.virtual('students', {
    ref: 'Student',
    localField: '_id',
    foreignField: 'classroomId'
});

// Virtual to check if classroom is at capacity
classroomSchema.virtual('isFull').get(function() {
    // This will be populated when students are loaded
    if (this.students && Array.isArray(this.students)) {
        return this.students.length >= this.capacity;
    }
    return false;
});

// Virtual for available seats
classroomSchema.virtual('availableSeats').get(function() {
    if (this.students && Array.isArray(this.students)) {
        return Math.max(0, this.capacity - this.students.length);
    }
    return this.capacity;
});

// Enable virtuals in JSON
classroomSchema.set('toJSON', { virtuals: true });
classroomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Classroom', classroomSchema);
