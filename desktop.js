const maxSize = 50 * 1024 * 1024;
 const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'jfif'];
 //activity picture uploading
 const uploadAct = multer({
 limits: { fileSize: maxSize },
 fileFilter: (req, file, cb) => {
 const ext = file.originalname.split('.').pop().toLowerCase();
 if (allowedExtensions.includes(ext)) {
 cb(null, true);
 } else {
 cb(new Error('Unsupported file type. Please upload an image (jpg, jpeg, png, jfif or gif).'));
 }
 }
 });
 server.use('/uploads/activityImages', express.static(path.join(__dirname, 'uploads/activityImages')));
 server.post('/post-activity', uploadAct.single('actImage'), async (req, res) => {
 const { actContent, classCode, actTitle } = req.body;
 const imgId = generateRandomImgId();
 const filename = `activityImages/${classCode}-${imgId}${path.extname(req.file.originalname)}`;
 try {
 if (!req.file) {
 return res.status(400).send('Please upload an activity image.');
 }
 const stream = cloudinary.uploader.upload_stream(
 {
 public_id: filename,
 resource_type: 'auto',
 },
 async (error, result) => {
 if (error) {
 console.error('Cloudinary upload error:', error);
 return res.status(500).send('Error uploading to Cloudinary');
 }
 const newAct = new Activity({
 actContent,
 classCode,
 actTitle,
 imgId,
 actImage: result.secure_url,
 createdAt: new Date(),
 });
 try {
 await newAct.save();
TODD: An Interactive Teacher
-Parent… 82
 res.redirect(`/todd
-activity
-posting/${classCode}`);
 } catch (err) {
 console.error('Database save error:', err);
 res.status(500).send('Internal Server Error');
 
}
 
}
 );
 stream.end(req.file.buffer);
 } catch (error) 
{
 console.error('Unexpected error:', error);
 res.status(500).send('Internal Server Error');
 
}
 });
server.post('/deleteAccEmail', async (req, res) => {
 const { email, classCode } = req.body;
 try {
 const user = await Classroom.findOne({ email });
 const token = crypto.randomBytes(32).toString('hex');
 const newRequest = new passwordReset({
 classCode,
 email,
 token,
 tokenExpiration: Date.now() + 3600000
 });
 await newRequest.save();
 const transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
 user: 'toddservicesotp@gmail.com',
 pass: 'lyqx npoy layp altq', 
 },
 });
 const mailOptions = {
 from: 'toddservicesotp@gmail.com',
 to: email,
 subject: 'Confirm deletion of account',
 html: `
 <p>
 Hello,
 We received a request to delete your account. If you did not make this request, 
please ignore this email and ensure that your account is secure.
 If you would like to proceed with deleting your account, please click the link below to confirm 
your request:
 <a href="${req.protocol}://${req.get('host')}/deleteAccount?token=${token}" class="resetbutton">Delete account</a>
 This action is permanent, and all your data will be removed. If you have any questions or need 
assistance, feel free to reach out to our support team.
 
 Thank you,
 The TODD team
 </p>
 
 `,
 };
 await transporter.sendMail(mailOptions);
 res.redirect(`/todd-account-settings/${classCode}`);
 } catch (error) {
 console.error('Error sending password reset email:', error);
 res.status(500).send('An error occurred while sending the password reset email.');
 }
});
server.post("/accept-signup", async (req, res) => {
 try {
 const { userId, classCode, action } = req.body;
 let updateStatus;
 if (action === "accept") {
 updateStatus = "accepted";
 } else if (action === "deny") {
 updateStatus = "denied";
 } else if (action === "remove") {
 updateStatus = "removed";
 } else {
 return res.status(400).send("Invalid action");
 }
 const user = await SignUpModel.findOneAndUpdate(
 { userId: userId, classCode: classCode },
 { status: updateStatus },
 { new: true }
 );
TODD: An Interactive Teacher-Parent… 84
 if (!user) {
 return res.status(404).send("User not found");
 }
 res.redirect(`/todd-pending-signups/${classCode}`);
 } catch (err) {
 console.error(err);
 res.status(500).send("Internal Server Error");
 }
});
<div id="chart"></div>
 <script>
 let classCode = '{{classroom.classCode}}';
console.log('Class Code:', classCode);
 async function fetchAttendanceData(classCode) {
 try {
 const response = await fetch(`/attendance/${classCode}`);
if (!response.ok) {
 throw new Error(`HTTP error! status: ${response.status}`);
 }
return await response.json();
 } catch (error) {
 console.error('Error fetching attendance data:', error);
 }
 }
 async function createPieChart(classCode) {
 const attendanceCounts = await fetchAttendanceData(classCode);
 console.log('Fetched Attendance Data:', attendanceCounts);
 let presentCount = 0;
 let absentCount = 0;
 if (attendanceCounts) {
 presentCount = attendanceCounts.present || 0;
 absentCount = attendanceCounts.absent || 0;
 if (presentCount === 0 && absentCount === 0) {
 absentCount = 1;
 }
 } else {
 absentCount = 1;
 }
 console.log(`Chart Data - Present: ${presentCount}, Absent: ${absentCount}`);
TODD: An Interactive Teacher-Parent… 85
 var options = {
 series: [presentCount, absentCount],
 chart: {
 type: 'pie',
 height: 350,
 width: 350
 },
 labels: ['Present', 'Absent'],
 colors: ['#295a15', '#7c9a5d'],
 responsive: [{
 breakpoint: 300,
 options: {
 chart: {
 width: 100
 },
 legend: {
 position: 'bottom',
 color: '#295a15'
 }
 }
 }]
 };
 var chart = new ApexCharts(document.querySelector("#chart"), options);
 chart.render();
}
 createPieChart(classCode);
 </script>
server.get('/attendance/:classCode', async (req, res) => {
 const classCode = req.params.classCode;
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 
 try {
 const attendanceRecords = await Attendance.find({
 classCode,
 createdAt: {
 $gte: today,
 $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
 }
 });
 
 let presentCount = 0;
 let absentCount = 0;
 let excusedCount = 0;
 
 attendanceRecords.forEach(record => {
 if (record.attendanceStatus === 'present') {
 presentCount++;
TODD: An Interactive Teacher-Parent… 86
 } else if (record.attendanceStatus === 'absent') {
 absentCount++;
 }
 });
 
 console.log(`Class Code: ${classCode}, Present: ${presentCount}, Absent: ${absentCount}, 
Excused: ${excusedCount}`);
 
 res.json({
 present: presentCount,
 absent: absentCount,
 excused: excusedCount
 });
 } catch (error) {
 console.error('Error fetching attendance data:', error);
 res.status(500).json({ error: 'Internal Server Error' });
 }
});
<script>
 const statusDisplay = document.getElementById('statusDisplay');
 function updateStatus() {
 if (window.navigator.onLine) {
 statusDisplay.style.display = 'none';
 document.querySelector('.no-network').style.display = 'none';
 } else {
 statusDisplay.style.display = 'flex';
 document.querySelector('.no-network').style.display = 'block';
 }
 }
 updateStatus();
 setInterval(updateStatus, 5000);
 window.addEventListener('online', () => {
 console.log('Became online');
 updateStatus();
 });
 window.addEventListener('offline', () => {
 console.log('Became offline');
 updateStatus();
 });
</script>
 <div class="display-time" style="display: none;"></div>
TODD: An Interactive Teacher-Parent… 87
 <script>
 document.addEventListener("DOMContentLoaded", function() {
 const dayTodaySpan = document.getElementById("dayToday");
 const date = new Date();
 const hours = date.getHours();
 let greeting;
if (hours < 12) {
 greeting = "Good Morning";
 } else if (hours < 18) {
 greeting = "Good Afternoon";
 } else {
 greeting = "Good Evening";
 }
 dayTodaySpan.textContent = greeting;
 const options = { weekday: 'long', year: 'numeric', month: 'long', day: 
'numeric' };
 const formattedDate = date.toLocaleDateString(undefined, options);
const [day, month, daynum] = formattedDate.split(', ');
 document.getElementById("day").textContent = day;
 document.getElementById("month").textContent = month;
 document.getElementById("daynum").textContent = daynum.split(' 
')[0];
 });
 const displayTime = document.querySelector(".display-time");
 // Time
function showTime() {
 let time = new Date();
 displayTime.innerText = time.toLocaleTimeString("en-US", { hour12: 
false });
 setTimeout(showTime, 1000);
 }
 showTime();
 function updateDate() {
let today = new Date();
 let dayName = today.getDay(),
 dayNum = today.getDate(),
month = today.getMonth(),
 year = today.getFullYear();
 const months = [
 "January",
TODD: An Interactive Teacher-Parent… 88
 "February",
 "March",
 "April",
"May",
"June",
 "July",
 "August",
"September",
"October",
 "November",
 "December",
 ];
const dayWeek = [
 "Sunday",
 "Monday",
"Tuesday",
"Wednesday",
"Thursday",
"Friday",
"Saturday",
 ];
const IDCollection = ["day", "daynum", "month", "year"];
const val = [dayWeek[dayName], dayNum, months[month], year];
for (let i = 0; i < IDCollection.length; i++) {
 document.getElementById(IDCollection[i]).firstChild.nodeValue = 
val[i];
 }
}
 updateDate();
 /*
code from >>>
https://codepen.io/WhisnuYs/pen/oNLBEvv
 */
 </script>
