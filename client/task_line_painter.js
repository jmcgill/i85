// Paint all tasks as a single line.

function TaskLinePainter(tasks, vacations, element, pixels_per_day, split_gap) {
  this.tasks_ = tasks;
  this.element_ = element;
  this.vacations_ = vacations;
  this.ppd_ = pixels_per_day;

  element.html("");
  var canvas = $("<canvas width='4000' height='2000'>");
  canvas.get(0).style.cursor = 'pointer';
  $(element).append(canvas);

  // Show burndown graphs when clicking on a particular task.
  var me = this;
  canvas.click(function(e) {
    var day = Math.round(((e.offsetX - 100) / pixels_per_day) + me.start_);
    for (var i = 0; i < me.tasks_.length; ++i) {
      if (me.tasks_[i].end_day == day) {
        window.location.href = "/burndown/" + me.tasks_[i].id;
      }
    }
  });
  this.context_ = canvas.get(0).getContext("2d");
  this.canvas_ = canvas;

  // Render a separate track for each user?
  this.split_ = true;
  this.split_gap_ = split_gap;

  // Index users.
  this.users_ = {};

  // User offset counts.
  this.user_offsets_ = {}

  var user_id = 0;
  for (var i = 0; i < this.tasks_.length; ++i) {
    var owner = this.tasks_[i].owner;
    if (this.users_[owner] == undefined) {
      this.users_[owner] = user_id;
      this.user_offsets_[owner] = 0;
      user_id += 1;
    }
  }


  // Colors for the railway tracks.
  this.colors_ = [
    "#003f87",
    "green",
    "red",
    "orange",
    "yellow",
    "purple"
  ];
}

TaskLinePainter.prototype.Paint = function() {
  this.stripe_pattern_image_ = new Image();
  this.stripe_pattern_image_.onload = bind(this, this.FinishPaint);
  this.stripe_pattern_image_.src = '/client/images/stripe.png';
}

TaskLinePainter.prototype.FinishPaint = function() {
  // Find the first and last task.
  var start = Math.pow(2, 32);
  var end = 0;
  for (var i = 0; i < this.tasks_.length; ++i) {
    if (this.tasks_[i].derived_start_day) {
      start = Math.min(this.tasks_[i].derived_start_day, start);
      end = Math.max(this.tasks_[i].end_day, end)
    }
  }
  this.start_ = start;

  // Find the first monday.
  var day_of_week = this.DayOffsetToDayOfWeek(start);
  var first_monday = (8 - day_of_week) % 7;

  // Paint each Monday.
  for (var i = 0; i <= ((end - start) / 7); ++i) {
    var x = ((i * 7 * this.ppd_) + first_monday) + 100;
    this.context_.strokeStyle = "gray";
    this.context_.lineWidth = 1;
    this.context_.beginPath();
    this.context_.moveTo(x, 0);
    this.context_.lineTo(x, 200);
    this.context_.stroke();
    this.context_.closePath();
  }

  // Paint vacations
  // TODO(jmcgill): Refactor to paint one user?
  for (var i = 0; i < this.vacations_.length; ++i) {
    var vacation = this.vacations_[i];
    var y = this.GetYForOwner(vacation.owner);
    var x = ((vacation.start_day - start) * this.ppd_) + 100;
    var x2 = ((vacation.end_day - vacation.start_day) * this.ppd_);

    var pattern = this.context_.createPattern(this.stripe_pattern_image_, 'repeat');
    this.context_.fillStyle = pattern;
    this.context_.rect(x, y - 50, x2, 100);
    this.context_.fill();
  }

  // Paint today.
  var today = Math.floor(new Date().getTime() / 86400000);
  var today_x = ((today - start) * this.ppd_) + 100;
  this.context_.strokeStyle = "gray";
  this.context_.lineWidth = 2;
  this.context_.beginPath();
  this.context_.moveTo(today_x, 0);
  this.context_.lineTo(today_x, 2000);
  this.context_.stroke();
  this.context_.closePath()

  // Paint the railway line.
  if (!this.split_) {
    this.context_.strokeStyle = "#003f87";
    this.context_.lineWidth = 10;
    this.context_.beginPath();
    this.context_.moveTo(0, 50);
    this.context_.lineTo(((end - start) * this.ppd_) + 100, 50);
    this.context_.stroke();
    this.context_.closePath();
  } else {
    for (var user in this.users_) {
      var y = this.GetYForOwner(user);
      this.context_.strokeStyle = this.colors_[this.users_[user] % this.colors_.length];
      this.context_.lineWidth = 10;
      this.context_.beginPath();
      this.context_.moveTo(0, y);
      this.context_.lineTo(((end - start) * this.ppd_) + 100, y);
      this.context_.stroke();
      this.context_.closePath();

      this.context_.font = "bold 20px sans-serif";
      this.context_.textAlign = "left";
      this.context_.textBaseline = "middle";
      this.context_.fillStyle = "gray";
      this.context_.fillText(user, 0, y + 15);
    }
  }

  // Paint each task.
  for (var i = 0; i < this.tasks_.length; ++i) {
    var day_offset = this.tasks_[i].end_day - start;
    var x = (day_offset * this.ppd_) + 100;
    var base_y = this.GetYForOwner(this.tasks_[i].owner);

    this.context_.strokeStyle = "black";
    this.context_.fillStyle = "white";
    this.context_.lineWidth = 4;
    this.context_.beginPath();
    this.context_.arc(x, base_y, 10, 0, Math.PI * 2, false);
    this.context_.fill();
    this.context_.stroke();
    this.context_.closePath();

    var t = this.tasks_[i];
    var y = 25;
    if ((this.user_offsets_[this.tasks_[i].owner] % 4) == 1) {
      y = 50;
    } else if ((this.user_offsets_[this.tasks_[i].owner] % 4) == 2) {
      y = -40;
    } else if ((this.user_offsets_[this.tasks_[i].owner] % 4) == 3) {
      y = -80;
    }
    this.user_offsets_[this.tasks_[i].owner]++;

    this.context_.font = "12px sans-serif";
    this.context_.textAlign = "center";
    this.context_.textBaseline = "middle";
    this.context_.fillStyle = "black";
    this.context_.fillText(this.tasks_[i].description, x, base_y + y);
    this.context_.fillText(this.DayOffsetToShortDate(this.tasks_[i].end_day), x, base_y + y + 15);

    this.context_.beginPath();
    this.context_.lineWidth = 0.5;
    this.context_.strokeStyle = "gray";
    this.context_.moveTo(x, base_y + y + (y < 0 ? 5 : -5));
    this.context_.lineTo(x, base_y + (y < 0 ? -5 : 5));
    this.context_.stroke();

    if (this.tasks_[i].derived_dep_end) {
      var dep_x = ((this.tasks_[i].derived_dep_end - start) * this.ppd_) + 100;
      var dep_y = this.GetYForOwner(this.tasks_[i].derived_dep_owner);
      this.context_.lineWidth = 0.5;
      this.context_.strokeStyle = "gray";
      this.context_.moveTo(x, base_y);
      this.context_.bezierCurveTo(x - 50, base_y + 100, dep_x + 50, dep_y - 100, dep_x, dep_y);
      this.context_.stroke();
    }
  }

  // Paint each derived task.
  // TODO(jmcgill): Push derived tasks into tasks_ and exlude from table.
  console.log('*** DERIVED TASKS: ', derived_tasks_);
  for (var i = 0; i < derived_tasks_.length; ++i) {
    var task = derived_tasks_[i];
    var day_offset = task.end_day - start;
    var x = (day_offset * this.ppd_) + 100;

    this.context_.strokeStyle = "red";
    this.context_.fillStyle = "white";
    this.context_.lineWidth = 4;
    this.context_.beginPath();
    this.context_.arc(x, 50, 10, 0, Math.PI * 2, false);
    this.context_.fill();
    this.context_.stroke();
    this.context_.closePath();

    var y = 25;
    if (i % 2) {
      y = -40;
    }

    this.context_.font = "12px sans-serif";
    this.context_.textAlign = "center";
    this.context_.textBaseline = "middle";
    this.context_.fillStyle = "black";
    this.context_.fillText(task.description, x, 50 + y);
    this.context_.fillText(this.DayOffsetToShortDate(task.end_day), x, 50 + y + 15);

    if (task.derived_dep_end) {
      var dep_x = ((task.derived_dep_end - start) * this.ppd_) + 100;
      this.context_.lineWidth = 0.5;
      this.context_.strokeStyle = "red";
      this.context_.moveTo(x, 50);
      this.context_.bezierCurveTo(x - 50, 150, dep_x + 50, -50, dep_x, 50);
      this.context_.stroke();
    }
  }
}

TaskLinePainter.prototype.DayOffsetToDayOfWeek = function(day_offset) {
  var ms_per_day = 86400000;
  var day = new Date(ms_per_day * day_offset);
  return day.getDay();
}

TaskLinePainter.prototype.DayOffsetToShortDate = function(day_offset) {
  var ms_per_day = 86400000;
  var day = new Date(ms_per_day * day_offset);
  return day.getDate() + '-' + (day.getMonth() + 1);
}

TaskLinePainter.prototype.GetTaskById = function(id) {
  for (var i = 0; i < this.tasks_.length; ++i) {
    if (this.tasks_[i].id == id) return this.tasks_[i];
  }
}

TaskLinePainter.prototype.GetYForOwner = function(owner) {
  if (!this.split_) {
    return 50;
  }
  return (this.split_gap_ * this.users_[owner]) + 50;
}
