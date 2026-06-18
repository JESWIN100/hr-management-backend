-- HR Core Database Schema
-- Run this file to set up the database

CREATE DATABASE IF NOT EXISTS hr_core;
USE hr_core;

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'hr', 'employee') DEFAULT 'hr',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  department_head VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Designations table
CREATE TABLE IF NOT EXISTS designations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  designation_name VARCHAR(100) NOT NULL UNIQUE,
  report_to VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  department_id INT,
  designation VARCHAR(100),
  joining_date DATE,
  employment_status ENUM('Active', 'On Leave', 'Terminated') DEFAULT 'Active',
  address TEXT,
  avatar VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Seed: default admin user (password: admin123)
INSERT IGNORE INTO users (name, email, password, role) VALUES
('HR Admin', 'admin@hrcore.com', '$2a$10$xvKhX9nRGGkWLSLtJHkHBuS8zxL7T.JvCnVV3Lf8yd.xNXwbRgXu', 'admin');

-- Seed: sample departments
INSERT IGNORE INTO departments (department_name, department_head) VALUES
('Engineering', 'James Anderson'),
('Design', 'Michael Davis'),
('IT & Infrastructure', 'Matthew Taylor'),
('Human Resources', 'Sarah Connor'),
('Marketing', 'Robert King');

-- Seed: sample designations
INSERT IGNORE INTO designations (designation_name, report_to) VALUES
('Principal Engineer', 'James Anderson'),
('Lead Designer', 'Michael Davis'),
('IT Manager', 'Matthew Taylor'),
('HR Director', 'Sarah Connor'),
('Marketing Specialist', 'Robert King');
