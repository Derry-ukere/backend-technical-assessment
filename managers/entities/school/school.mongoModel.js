const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'School name is required'],
        trim: true,
        minlength: [2, 'School name must be at least 2 characters'],
        maxlength: [200, 'School name cannot exceed 200 characters']
    },
    address: {
        type: String,
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters']
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid phone number']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    principal: {
        type: String,
        trim: true,
        maxlength: [100, 'Principal name cannot exceed 100 characters']
    },
    establishedYear: {
        type: Number,
        min: [1800, 'Established year must be after 1800'],
        max: [new Date().getFullYear(), 'Established year cannot be in the future']
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

// Index for faster queries
schoolSchema.index({ name: 1 });
schoolSchema.index({ isActive: 1 });
schoolSchema.index({ createdBy: 1 });

// Virtual for getting associated classrooms count
schoolSchema.virtual('classrooms', {
    ref: 'Classroom',
    localField: '_id',
    foreignField: 'schoolId'
});

// Virtual for getting associated students count
schoolSchema.virtual('students', {
    ref: 'Student',
    localField: '_id',
    foreignField: 'schoolId'
});

// Enable virtuals in JSON
schoolSchema.set('toJSON', { virtuals: true });
schoolSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('School', schoolSchema);
