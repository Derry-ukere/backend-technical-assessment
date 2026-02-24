const mongoose = require('mongoose');

const transferHistorySchema = new mongoose.Schema({
    fromSchool: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    toSchool: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    fromClassroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom'
    },
    toClassroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom'
    },
    date: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        trim: true,
        maxlength: [500, 'Reason cannot exceed 500 characters']
    }
}, { _id: true });

const studentSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [1, 'First name must be at least 1 character'],
        maxlength: [100, 'First name cannot exceed 100 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [1, 'Last name must be at least 1 character'],
        maxlength: [100, 'Last name cannot exceed 100 characters']
    },
    email: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple null values
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    dateOfBirth: {
        type: Date,
        validate: {
            validator: function(value) {
                return !value || value < new Date();
            },
            message: 'Date of birth must be in the past'
        }
    },
    gender: {
        type: String,
        enum: {
            values: ['male', 'female', 'other'],
            message: 'Gender must be male, female, or other'
        }
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required']
    },
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom'
    },
    enrollmentDate: {
        type: Date,
        default: Date.now
    },
    guardianName: {
        type: String,
        trim: true,
        maxlength: [200, 'Guardian name cannot exceed 200 characters']
    },
    guardianPhone: {
        type: String,
        trim: true,
        match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid phone number']
    },
    guardianEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    address: {
        type: String,
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    transferHistory: [transferHistorySchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator reference is required']
    }
}, {
    timestamps: true
});

// Indexes for faster queries
studentSchema.index({ schoolId: 1 });
studentSchema.index({ classroomId: 1 });
studentSchema.index({ isActive: 1 });
studentSchema.index({ firstName: 1, lastName: 1 });
studentSchema.index({ enrollmentDate: 1 });

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
studentSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Enable virtuals in JSON
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

// Pre-save middleware to validate classroom belongs to school
studentSchema.pre('save', async function() {
    if (this.classroomId && this.isModified('classroomId')) {
        const Classroom = mongoose.model('Classroom');
        const classroom = await Classroom.findById(this.classroomId);
        if (!classroom) {
            throw new Error('Classroom not found');
        }
        if (classroom.schoolId.toString() !== this.schoolId.toString()) {
            throw new Error('Classroom does not belong to the specified school');
        }
    }
});

module.exports = mongoose.model('Student', studentSchema);
