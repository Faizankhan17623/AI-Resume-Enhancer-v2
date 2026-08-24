const mongoose = require('mongoose')

// one experience/education/project entry sir — no _id noise needed, these are always
// rewritten as a whole array from the frontend, never patched field-by-field
const experienceSchema = new mongoose.Schema({
    company: { type: String, trim: true, maxlength: 120 },
    role: { type: String, trim: true, maxlength: 120 },
    location: { type: String, trim: true, maxlength: 120 },
    startDate: { type: String, trim: true, maxlength: 30 },
    endDate: { type: String, trim: true, maxlength: 30 },
    current: { type: Boolean, default: false },
    bullets: [{ type: String, trim: true, maxlength: 300 }],
}, { _id: false })

const educationSchema = new mongoose.Schema({
    school: { type: String, trim: true, maxlength: 150 },
    degree: { type: String, trim: true, maxlength: 150 },
    field: { type: String, trim: true, maxlength: 150 },
    startDate: { type: String, trim: true, maxlength: 30 },
    endDate: { type: String, trim: true, maxlength: 30 },
    gpa: { type: String, trim: true, maxlength: 20 },
}, { _id: false })

const projectSchema = new mongoose.Schema({
    name: { type: String, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 400 },
    link: { type: String, trim: true, maxlength: 300 },
    bullets: [{ type: String, trim: true, maxlength: 300 }],
}, { _id: false })

const certificationSchema = new mongoose.Schema({
    name: { type: String, trim: true, maxlength: 150 },
    issuer: { type: String, trim: true, maxlength: 150 },
    date: { type: String, trim: true, maxlength: 30 },
}, { _id: false })

// one saved snapshot of the resume's content sir — everything a template needs to re-render
// that point in time, minus templateId/color/photoUrl (those are presentation, not content,
// and restoring an old draft shouldn't also revert someone's later template/color choice)
const versionSchema = new mongoose.Schema({
    title: { type: String, trim: true, maxlength: 100 },
    personalInfo: {
        fullName: { type: String, trim: true, maxlength: 100, default: '' },
        email: { type: String, trim: true, maxlength: 100, default: '' },
        phone: { type: String, trim: true, maxlength: 30, default: '' },
        location: { type: String, trim: true, maxlength: 150, default: '' },
        linkedin: { type: String, trim: true, maxlength: 300, default: '' },
        website: { type: String, trim: true, maxlength: 300, default: '' },
    },
    summary: { type: String, trim: true, maxlength: 800, default: '' },
    experience: [experienceSchema],
    education: [educationSchema],
    skills: [{ type: String, trim: true, maxlength: 60 }],
    projects: [projectSchema],
    certifications: [certificationSchema],
    savedAt: { type: Date, default: Date.now },
}, { _id: true })

// a resume BUILT from structured form data sir — distinct from Models/Resume.js, which stores
// an uploaded PDF's raw parsed text for AI review. This one is fully structured/editable JSON
// so any template component can render it, and the builder form can re-hydrate an edit session from it.
const builtResumeSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // which template component renders this data sir — see Templates/templateRegistry.js on the frontend
        templateId: {
            type: String,
            required: true,
        },
        // user-given name for their own list, e.g. "Frontend Dev — Google" sir
        title: {
            type: String,
            trim: true,
            maxlength: 100,
            default: 'Untitled resume',
        },
        personalInfo: {
            fullName: { type: String, trim: true, maxlength: 100, default: '' },
            email: { type: String, trim: true, maxlength: 100, default: '' },
            phone: { type: String, trim: true, maxlength: 30, default: '' },
            location: { type: String, trim: true, maxlength: 150, default: '' },
            linkedin: { type: String, trim: true, maxlength: 300, default: '' },
            website: { type: String, trim: true, maxlength: 300, default: '' },
        },
        summary: { type: String, trim: true, maxlength: 800, default: '' },
        experience: [experienceSchema],
        education: [educationSchema],
        skills: [{ type: String, trim: true, maxlength: 60 }],
        projects: [projectSchema],
        certifications: [certificationSchema],
        // optional headshot for templates that render a photo sir — a Cloudinary secure_url
        photoUrl: { type: String, trim: true, maxlength: 500, default: '' },
        // per-resume accent color sir — hex string, each template maps this onto its own
        // header/sidebar/accent elements instead of a hardcoded palette
        color: { type: String, trim: true, maxlength: 20, default: '' },
        // last 5 content snapshots sir, oldest first — capped and time-gated (15 min minimum
        // between snapshots) in the controller so continuous autosave-while-typing doesn't
        // spam near-duplicate versions. See controllers/BuiltResume.js maybeSnapshotVersion.
        versions: [versionSchema],
        // public portfolio link sir — same shape as Review's shareId/isPublic (Models/Review.js),
        // sparse so the unique index ignores the (many) resumes never shared. Pro/ProMax only,
        // gated in the controller, not here.
        shareId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        isPublic: {
            type: Boolean,
            default: false,
        },
    }, { timestamps: true }
)

builtResumeSchema.index({ user: 1, updatedAt: -1 })

module.exports = mongoose.model('BuiltResume', builtResumeSchema)
