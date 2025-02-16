
app.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    const imageUrl = await uploadToCloudinary(req.file.buffer);
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});


app.post('/verify-classcode', async (req, res) => {
  const { classCode } = req.body;
  const classroom = await Classroom.findOne({ classCode });

  if (classroom) {
    return res.status(200).json({ message: 'Class code verified' });
  } else {
    return res.status(404).json({ message: 'Invalid class code' });
  }
});


app.post('/signup', upload.fields([{ name: 'guardianPicture' }, { name: 'studentPicture' }]), async (req, res) => {
  const { Gfirstname, Gmiddleinitial, Glastname, Sfirstname, Smiddleinitial, Slastname, username, password, email, number, sex, birthdate, classCode, relation, guardianSex } = req.body;
  const userId = generateRandomId();

  try {
    if (!req.files['guardianPicture'] || !req.files['studentPicture']) {
      return res.status(400).send('Both Guardian and Student pictures are required.');
    }

  
    const guardianPictureResult = await uploadToCloudinary(req.files['guardianPicture'][0].buffer);
    
    const studentPictureResult = await uploadToCloudinary(req.files['studentPicture'][0].buffer);

    const existingUser = await SignUpModel.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).send('Username or Email already exists.');
    }

  
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

 
    const newSignUp = new SignUpModel({
      userId,
      Gfirstname,
      Gmiddleinitial,
      Glastname,
      Sfirstname,
      Smiddleinitial,
      Slastname,
      username,
      email,
      password: hashedPassword,
      number,
      sex,
      guardianSex,
      birthdate,
      classCode,
      relation,
      guardianPicture: guardianPictureResult,
      studentPicture: studentPictureResult,
      status: 'pending',
      role: 'student',
      madeBy: 'guardian',
    });

    await newSignUp.save();
    res.status(201).send('Signup successful, your application is pending review.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error in signup process.');
  }
});

// Generate Random User ID
function generateRandomId() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let userId = '';
  for (let i = 0; i < 8; i++) {
    userId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return userId;
}

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Blank fields", blankFields: true });
  }

  try {
    // Search by either username or email
    const user = await SignUpModel.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found", wrongName: true });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password", wrongPassword: true });
    }

    // Successful login
    res.status(200).json({
      message: "Login successful",
      userId: user.userId,
      classCode: user.classCode,
      Gfirstname: user.Gfirstname,
      Glastname: user.Glastname,
      guardianPicture: user.guardianPicture,
      status: user.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


app.get('/announcement', async (req, res) => { 
  try {
      const { userId, classCode } = req.query;
      console.log('Fetching tasks for userId:', userId, 'and classCode:', classCode);
      
      const tasks = await Task.find({ classCode: classCode }).sort({ createdAt: -1 });
      console.log('Fetched tasks:', tasks);

      // Send the tasks as JSON response
      res.json({ userId: userId, classCode: classCode, tasks: tasks });
  } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/comment/:taskNumber', async (req, res) => {
  const { userId, classCode, content, taskTitle } = req.body; 
  const taskNumber = req.params.taskNumber;

  try {
    if (!userId || !classCode || !taskNumber || !content || !taskTitle) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await SignUpModel.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { Gfirstname, Glastname, guardianPicture, role } = user;

    const newComment = new Comment({
      userId,
      classCode,
      taskNumber,
      taskTitle,  
      content,
      Gfirstname,
      Glastname,
      guardianPicture,
      role,
      createdAt: new Date(),
    });

    const savedComment = await newComment.save();
    res.status(201).json({ message: 'Comment posted successfully', comment: savedComment });
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).json({ message: 'Failed to post comment. Please try again.' });
  }
});


app.get('/events', async (req, res) => {
  const { classCode } = req.query; 

  try {
    
    if (!classCode) {
      return res.status(400).json({ message: 'Missing classCode' });
    }

    
    const events = await Event.find({ classCode }, 'title event description startDate endDate color');
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.get('/activities', async (req, res) => {
  const { classCode } = req.query;

  try {
    if (!classCode) {
      return res.status(400).json({ message: 'classCode is required' });
    }

    const activities = await Activity.find({ classCode }, 'actTitle createdAt actImage edited actHeart likedBy');
    
    const updatedActivities = activities.map(activity => ({
      ...activity._doc,
      actHeart: activity.actHeart || 0
    }));

    res.status(200).json(updatedActivities);
  } catch (error) {
    console.error('Error fetching activities:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.put('/activity/heart/:activityId', async (req, res) => {
  const { activityId } = req.params;
  const { userId, action } = req.body;

  try {
    const activity = await Activity.findById(activityId);

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    activity.likedBy = activity.likedBy || [];

    const hasLiked = activity.likedBy.includes(userId);

    if (action === 'like') {
      if (!hasLiked) {
        activity.likedBy.push(userId);
        activity.actHeart += 1;
      }
    } else if (action === 'unlike') {
      if (hasLiked) {
        activity.likedBy = activity.likedBy.filter(id => id !== userId);
        activity.actHeart = Math.max(0, activity.actHeart - 1);
      }
    }

    await activity.save();
    res.status(200).json({ message: 'Activity updated', activity });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ message: 'Error updating activity' });
  }
});



app.post('/post-message', async (req, res) => {
  const { from, message, classCode, userId, subject } = req.body; 

  try {
    if (!from || !message || !classCode || !userId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    
    const user = await SignUpModel.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { Glastname, Gfirstname } = user; 

    
    const existingChatCount = await Chats.countDocuments({ classCode });
    const chatNumber = existingChatCount + 1; 
    const roomId = userId; 

    const newChat = new Chats({
      from,
      message,
      classCode,
      userId,
      roomId, 
      subject, 
      chatNumber, 
      createdAt: new Date(),
      Glastname,  
      Gfirstname, 
      isRead: false 
    });

    await newChat.save();
    res.status(201).json({ message: 'Message saved successfully', newChat });

  } catch (error) {
    console.error('Error saving message:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


const moment = require('moment');

app.get('/attendance', async (req, res) => {
  const { userId, classCode } = req.query; 

  if (!userId || !classCode) {
    return res.status(400).json({ message: 'userId and classCode are required' });
  }

  try {
    
    const today = moment().startOf('day').toDate();

    
    const attendance = await Attendance.findOne({
      userId,
      classCode,
      createdAt: { $gte: today }, 
    }).sort({ createdAt: -1 });

    if (!attendance) {
      return res.status(404).json({ message: 'No attendance found for today' });
    }

    
    res.status(200).json({
      imagePath: attendance.imagePath, 
      Sfirstname: attendance.Sfirstname,
      createdAt: attendance.createdAt,
    });
  } catch (error) {
    console.error('Error fetching attendance:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Request OTP for forgot password
app.post('/request-otp', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await SignUpModel.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = crypto.randomInt(100000, 999999);
    const otpExpiration = Date.now() + 10 * 60 * 1000;

    user.otp = otp; 
    user.otpExpiration = otpExpiration;
    await user.save();

    await transporter.sendMail({
      from: 'toddservicesotp@gmail.com',
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
    });

    res.json({ message: 'OTP sent to email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});


// Verify OTP and Reset Password
app.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await SignUpModel.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

   
    console.log('Stored OTP:', user.otp);
    console.log('Entered OTP:', otp);


    if (user.otp !== parseInt(otp, 10) || Date.now() > user.otpExpiration) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;  
    user.otp = null;                 
    user.otpExpiration = null;       

    await user.save(); 

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error); 
    res.status(500).json({ message: 'Server error', error });
  }
});


app.get('/grades/:userId/:classCode', async (req, res) => {
  const { userId, classCode } = req.params;
  try {
    const grades = await Grades.find({ userId, classCode });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching grades' });
  }
});

app.get('/legends/:classCode', async (req, res) => {
  const { classCode } = req.params;
  try {
    const legends = await Legend.find({ classCode });
    res.json(legends);
  } catch (error) {
    console.error('Error fetching legends:', error);
    res.status(500).json({ error: 'Failed to fetch legends' });
  }
});


app.delete("/delete-user/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const deletedUser = await SignUpModel.findOneAndDelete({ email });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User canceled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error canceling user", error });
  }
});
