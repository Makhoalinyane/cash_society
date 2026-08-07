SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;

-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: cash_society
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `members`
--

LOCK TABLES `members` WRITE;
/*!40000 ALTER TABLE `members` DISABLE KEYS */;
INSERT INTO `members` (`id`, `full_name`, `phone`, `mpesa_number`, `email`, `joined_date`, `is_active`, `created_at`, `updated_at`) VALUES (1,'Ts\'eliso Makhoalinyane','26658548897','26658548897','makhoalinyanetseliso@gmail.com','2026-07-10',1,'2026-07-10 12:35:20','2026-07-10 12:36:52'),(2,'Sefonthoane Mohohla','26657271990','26657271990',NULL,'2026-07-10',1,'2026-07-10 12:44:58','2026-07-10 12:44:58'),(3,'Ts\'epo Letlaka','26657857273','26657857273',NULL,'2026-07-10',1,'2026-07-10 12:46:28','2026-07-10 12:46:28'),(4,'Mokheseng Leraisa','26657376413','26657376413',NULL,'2026-07-10',1,'2026-07-10 12:48:32','2026-07-10 12:48:32'),(5,'Mots\'ilisi Chatsane','26658995388','26658995388',NULL,'2026-07-10',1,'2026-07-10 12:49:56','2026-07-10 12:49:56'),(6,'Mosebo Mosakeng','26663703548','26657419312',NULL,'2026-07-10',1,'2026-07-10 12:53:58','2026-07-10 12:53:58');
/*!40000 ALTER TABLE `members` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-04 13:49:19
-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: cash_society
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `loans`
--

LOCK TABLES `loans` WRITE;
/*!40000 ALTER TABLE `loans` DISABLE KEYS */;
INSERT INTO `loans` (`id`, `member_id`, `principal_amount`, `interest_rate`, `interest_months`, `loan_date`, `loan_month`, `loan_year`, `mpesa_reference`, `status`, `total_interest_charged`, `total_interest_paid`, `total_principal_paid`, `notes`, `created_at`) VALUES (1,1,1000.00,0.1500,3,'2026-01-01',1,2026,'loan','paid',300.00,300.00,1000.00,'Business','2026-07-10 13:07:51'),(2,1,200.00,0.1500,3,'2026-03-17',3,2026,'moshe','paid',60.00,60.00,200.00,'Loan','2026-07-13 08:55:31'),(3,1,2000.00,0.1500,3,'2026-05-12',5,2026,'moshe','active',900.00,0.00,0.00,'Loan','2026-07-13 09:08:37'),(4,6,2000.00,0.1500,3,'2026-03-21',3,2026,'masentle','paid',900.00,900.00,2000.00,'Loan','2026-07-13 09:10:46'),(5,6,2000.00,0.1500,3,'2026-07-04',7,2026,'masentle','active',300.00,0.00,0.00,'Loan','2026-07-13 09:15:53'),(6,3,700.00,0.1500,3,'2026-01-03',1,2026,'makhotsa','paid',105.00,105.00,700.00,'Loan','2026-07-13 09:17:19'),(7,3,1000.00,0.1500,3,'2026-02-06',2,2026,'makhotsa','paid',150.00,150.00,1000.00,'Loan','2026-07-13 09:31:34'),(8,3,2000.00,0.1500,3,'2026-03-18',3,2026,'makhotsa','paid',300.00,300.00,2000.00,'Loan','2026-07-13 09:35:37'),(9,2,1000.00,0.1500,3,'2026-01-06',1,2026,'base','paid',150.00,150.00,1000.00,'Loan','2026-07-13 09:43:45'),(10,2,350.00,0.1500,3,'2026-01-21',1,2026,'base','paid',157.50,157.50,350.00,'Loan','2026-07-13 09:46:40'),(11,2,500.00,0.1500,3,'2026-06-10',6,2026,'base','active',150.00,0.00,0.00,'Loan','2026-07-13 09:52:31'),(12,5,1000.00,0.1500,3,'2026-01-11',1,2026,'tshidi','paid',300.00,300.00,1000.00,'Loan','2026-07-13 09:55:24'),(13,5,1000.00,0.1500,3,'2026-05-12',5,2026,'tshidi','paid',450.00,450.00,1000.00,'Loan','2026-07-13 09:59:21'),(14,4,2000.00,0.1500,3,'2026-02-05',2,2026,'khetsi','paid',600.00,600.00,2000.00,'Loan','2026-07-13 10:02:08'),(15,4,500.00,0.1500,3,'2026-05-10',5,2026,'khetsi','paid',75.00,75.00,500.00,'Loan','2026-07-13 10:08:13'),(16,4,2000.00,0.1500,3,'2026-06-05',6,2026,'khetsi','active',600.00,300.00,0.00,'Loan','2026-07-13 10:10:49'),(17,5,2000.00,0.1500,3,'2026-08-02',8,2026,'tshidi','active',300.00,0.00,0.00,'Loan','2026-08-02 14:34:32');
/*!40000 ALTER TABLE `loans` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-04 13:49:19
-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: cash_society
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` (`id`, `member_id`, `loan_id`, `transaction_type`, `amount`, `transaction_date`, `transaction_month`, `transaction_year`, `mpesa_reference`, `description`, `is_late`, `created_at`) VALUES (1,1,1,'loan_disbursement',1000.00,'2026-01-01',1,2026,'loan','Business',0,'2026-07-10 13:07:51'),(2,4,NULL,'contribution',550.00,'2026-01-08',1,2026,'mk','Contribution',0,'2026-07-10 13:13:03'),(3,6,NULL,'contribution',550.00,'2026-01-04',1,2026,'ms','Contribution',0,'2026-07-10 13:14:07'),(4,2,NULL,'contribution',550.00,'2026-01-03',1,2026,'sf','Contribution',0,'2026-07-10 13:14:39'),(5,1,NULL,'contribution',550.00,'2026-01-01',1,2026,'mm','Contribution',0,'2026-07-10 13:15:17'),(6,3,NULL,'contribution',550.00,'2026-01-02',1,2026,'tr','Contribution',0,'2026-07-10 13:16:23'),(7,4,NULL,'contribution',550.00,'2026-02-01',2,2026,'mk','Contribution',0,'2026-07-10 13:20:52'),(8,5,NULL,'contribution',550.00,'2026-02-03',2,2026,'tshidi','Contribution',0,'2026-07-10 13:22:48'),(9,2,NULL,'contribution',550.00,'2026-02-03',2,2026,'base','Monthly contribution',0,'2026-07-10 13:24:04'),(10,3,NULL,'contribution',550.00,'2026-02-06',2,2026,'makhotsa','Contribution',0,'2026-07-10 13:27:47'),(11,1,NULL,'contribution',550.00,'2026-02-04',2,2026,'moshe','Monthly contribution',0,'2026-07-10 13:29:46'),(12,1,NULL,'contribution',550.00,'2026-03-01',3,2026,'moshe','Monthly contribution',0,'2026-07-10 13:32:14'),(13,3,NULL,'contribution',550.00,'2026-03-01',3,2026,'makhotsa','Monthly contribution',0,'2026-07-10 13:33:37'),(14,2,NULL,'contribution',550.00,'2026-03-06',3,2026,'base','Monthly contribution',0,'2026-07-10 13:36:04'),(15,4,NULL,'contribution',550.00,'2026-03-06',3,2026,'khetsi','Monthly contribution',0,'2026-07-10 13:37:53'),(16,6,NULL,'contribution',550.00,'2026-03-07',3,2026,'masentle','Monthly contribution',0,'2026-07-10 13:39:01'),(17,5,NULL,'contribution',550.00,'2026-03-08',3,2026,'tshidi','Monthly contribution',0,'2026-07-10 13:39:48'),(18,6,NULL,'contribution',550.00,'2026-02-09',2,2026,'masentle','Monthly contribution',1,'2026-07-10 13:46:14'),(19,6,NULL,'late_penalty',275.00,'2026-02-09',2,2026,'masentle','Late penalty (50% of M550)',1,'2026-07-10 13:47:02'),(20,1,NULL,'contribution',550.00,'2026-04-01',4,2026,'moshe','Contribution',0,'2026-07-13 07:22:20'),(21,4,NULL,'contribution',550.00,'2026-04-02',4,2026,'khetsi','Contribution',0,'2026-07-13 07:24:48'),(22,3,NULL,'contribution',550.00,'2026-04-07',4,2026,'makhotsa','Contribution',0,'2026-07-13 07:25:29'),(23,5,NULL,'contribution',550.00,'2026-04-08',4,2026,'tshidi','Contribution',0,'2026-07-13 07:26:18'),(24,2,NULL,'contribution',550.00,'2026-04-08',4,2026,'base','Contribution',0,'2026-07-13 07:27:22'),(25,6,NULL,'contribution',550.00,'2026-04-08',4,2026,'masentle','Contribution',0,'2026-07-13 07:28:13'),(26,1,NULL,'contribution',550.00,'2026-05-01',5,2026,'moshe','Contribution',0,'2026-07-13 07:29:19'),(27,6,NULL,'contribution',550.00,'2026-05-01',5,2026,'masentle','Contribution',0,'2026-07-13 07:30:16'),(28,3,NULL,'contribution',550.00,'2026-05-09',5,2026,'makhotsa','Contribution',1,'2026-07-13 07:31:49'),(29,5,NULL,'contribution',550.00,'2026-05-08',5,2026,'tshidi','Contribution',0,'2026-07-13 07:33:00'),(30,4,NULL,'contribution',550.00,'2026-05-08',5,2026,'khetsi','Contribution',0,'2026-07-13 07:34:17'),(31,1,NULL,'contribution',550.00,'2026-06-01',6,2026,'moshe','Contribution',0,'2026-07-13 07:37:10'),(32,4,NULL,'contribution',550.00,'2026-06-05',6,2026,'khetsi','Contribution',0,'2026-07-13 07:39:25'),(33,6,NULL,'contribution',550.00,'2026-06-06',6,2026,'masentle','Contribution',0,'2026-07-13 07:40:26'),(36,2,NULL,'contribution',550.00,'2026-06-08',6,2026,'base','Contribution',0,'2026-07-13 07:43:59'),(38,3,NULL,'contribution',550.00,'2026-06-08',6,2026,'makhotsa','Contribution',0,'2026-07-13 08:03:05'),(39,1,NULL,'contribution',550.00,'2026-07-01',7,2026,'moshe','Contribution',0,'2026-07-13 08:05:11'),(40,6,NULL,'contribution',550.00,'2026-07-02',7,2026,'masentle','Contribution',0,'2026-07-13 08:05:59'),(41,2,NULL,'contribution',550.00,'2026-07-05',7,2026,'base','Contribution',0,'2026-07-13 08:06:47'),(42,3,NULL,'contribution',550.00,'2026-07-05',7,2026,'makhotsa','Contribution',0,'2026-07-13 08:07:38'),(43,4,NULL,'contribution',550.00,'2026-07-08',7,2026,'khetsi','Contribution',0,'2026-07-13 08:08:33'),(44,2,NULL,'contribution',550.00,'2026-05-08',5,2026,'base','Contribution',0,'2026-07-13 08:12:53'),(45,5,NULL,'contribution',500.00,'2026-06-09',6,2026,'tshidi','Contribution',0,'2026-07-13 08:16:16'),(46,1,1,'loan_repayment',1000.00,'2026-02-13',2,2026,'moshe','Loan',0,'2026-07-13 08:24:00'),(47,1,1,'interest_payment',300.00,'2026-02-13',2,2026,'moshe','interest',0,'2026-07-13 08:25:04'),(48,1,2,'loan_disbursement',200.00,'2026-03-17',3,2026,'moshe','Loan',0,'2026-07-13 08:55:31'),(49,1,2,'interest_payment',60.00,'2026-05-11',5,2026,'moshe','interest',0,'2026-07-13 08:57:18'),(50,1,2,'loan_repayment',200.00,'2026-05-11',5,2026,'moshe','Loan',0,'2026-07-13 08:58:14'),(51,1,3,'loan_disbursement',2000.00,'2026-05-12',5,2026,'moshe','Loan',0,'2026-07-13 09:08:37'),(52,6,4,'loan_disbursement',2000.00,'2026-03-21',3,2026,'masentle','Loan',0,'2026-07-13 09:10:46'),(53,6,4,'interest_payment',900.00,'2026-07-02',7,2026,'masentle','Loan',0,'2026-07-13 09:12:20'),(54,6,4,'loan_repayment',2000.00,'2026-07-02',7,2026,'masentle','Loan',0,'2026-07-13 09:12:20'),(55,6,5,'loan_disbursement',2000.00,'2026-07-04',7,2026,'masentle','Loan',0,'2026-07-13 09:15:53'),(56,3,6,'loan_disbursement',700.00,'2026-01-03',1,2026,'makhotsa','Loan',0,'2026-07-13 09:17:19'),(57,3,6,'interest_payment',105.00,'2026-02-03',2,2026,'makhotsa','Loan payment',0,'2026-07-13 09:19:40'),(58,3,6,'loan_repayment',700.00,'2026-02-03',2,2026,'makhotsa','Loan payment',0,'2026-07-13 09:19:40'),(59,3,7,'loan_disbursement',1000.00,'2026-02-06',2,2026,'makhotsa','Loan',0,'2026-07-13 09:31:34'),(60,3,7,'interest_payment',150.00,'2026-02-22',2,2026,'makhotsa','interest',0,'2026-07-13 09:33:18'),(61,3,7,'loan_repayment',1000.00,'2026-03-01',3,2026,'makhotsa','Loan payment',0,'2026-07-13 09:34:18'),(62,3,8,'loan_disbursement',2000.00,'2026-03-18',3,2026,'makhotsa','Loan',0,'2026-07-13 09:35:37'),(63,3,8,'loan_repayment',2000.00,'2026-04-13',4,2026,'makhotsa','Loan payment',0,'2026-07-13 09:37:12'),(64,3,8,'interest_payment',300.00,'2026-04-07',4,2026,'makhotsa','interest',0,'2026-07-13 09:39:24'),(65,2,9,'loan_disbursement',1000.00,'2026-01-06',1,2026,'base','Loan',0,'2026-07-13 09:43:45'),(66,2,9,'loan_repayment',1000.00,'2026-01-11',1,2026,'base','Loan payment',0,'2026-07-13 09:44:39'),(67,2,9,'interest_payment',150.00,'2026-01-11',1,2026,'base','interest',0,'2026-07-13 09:45:30'),(68,2,10,'loan_disbursement',350.00,'2026-01-21',1,2026,'base','Loan',0,'2026-07-13 09:46:40'),(69,2,10,'interest_payment',157.50,'2026-05-08',5,2026,'base','Loan payment',0,'2026-07-13 09:48:04'),(70,2,10,'loan_repayment',350.00,'2026-05-07',5,2026,'base','Loan payment',0,'2026-07-13 09:48:04'),(71,2,11,'loan_disbursement',500.00,'2026-06-10',6,2026,'base','Loan',0,'2026-07-13 09:52:31'),(72,5,12,'loan_disbursement',1000.00,'2026-01-11',1,2026,'tshidi','Loan',0,'2026-07-13 09:55:24'),(73,5,12,'interest_payment',150.00,'2026-01-26',1,2026,'tshidi','interest',0,'2026-07-13 09:56:38'),(74,5,12,'interest_payment',150.00,'2026-03-14',3,2026,'tshidi','Loan payment',0,'2026-07-13 09:58:09'),(75,5,12,'loan_repayment',1000.00,'2026-03-14',3,2026,'tshidi','Loan payment',0,'2026-07-13 09:58:09'),(76,5,13,'loan_disbursement',1000.00,'2026-05-12',5,2026,'tshidi','Loan',0,'2026-07-13 09:59:21'),(77,4,14,'loan_disbursement',2000.00,'2026-02-05',2,2026,'khetsi','Loan',0,'2026-07-13 10:02:08'),(78,4,14,'interest_payment',300.00,'2026-03-06',3,2026,'khetsi','interest',0,'2026-07-13 10:05:55'),(79,4,14,'interest_payment',300.00,'2026-04-02',4,2026,'khetsi','Loan payment',0,'2026-07-13 10:07:20'),(80,4,14,'loan_repayment',2000.00,'2026-04-02',4,2026,'khetsi','Loan payment',0,'2026-07-13 10:07:20'),(81,4,15,'loan_disbursement',500.00,'2026-05-10',5,2026,'khetsi','Loan',0,'2026-07-13 10:08:13'),(82,4,15,'interest_payment',75.00,'2026-06-05',6,2026,'khetsi','Loan payment',0,'2026-07-13 10:09:51'),(83,4,15,'loan_repayment',500.00,'2026-06-05',6,2026,'khetsi','Loan payment',0,'2026-07-13 10:09:51'),(84,4,16,'loan_disbursement',2000.00,'2026-06-05',6,2026,'khetsi','Loan',0,'2026-07-13 10:10:49'),(85,4,16,'interest_payment',300.00,'2026-07-08',7,2026,'khetsi','interest',0,'2026-07-13 12:25:53'),(86,5,NULL,'contribution',550.00,'2026-01-14',1,2026,'tshidi','Contribution',1,'2026-07-14 20:07:27'),(87,5,13,'interest_payment',450.00,'2026-08-02',8,2026,'tshidi','Loan payment',0,'2026-08-02 14:03:47'),(88,5,13,'loan_repayment',1000.00,'2026-08-02',8,2026,'tshidi','Loan payment',0,'2026-08-02 14:03:47'),(89,5,17,'loan_disbursement',2000.00,'2026-08-02',8,2026,'tshidi','Loan',0,'2026-08-02 14:34:32'),(90,1,NULL,'contribution',550.00,'2026-08-03',8,2026,'moshe','Contribution',0,'2026-08-03 14:20:55'),(91,2,NULL,'contribution',550.00,'2026-08-03',8,2026,'base','Contribution',0,'2026-08-03 17:06:23');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-04 13:49:19
-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: cash_society
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `loan_interest_accruals`
--

LOCK TABLES `loan_interest_accruals` WRITE;
/*!40000 ALTER TABLE `loan_interest_accruals` DISABLE KEYS */;
INSERT INTO `loan_interest_accruals` (`id`, `loan_id`, `member_id`, `accrual_month`, `accrual_year`, `interest_amount`, `is_paid`, `paid_date`, `created_at`) VALUES (1,1,1,1,2026,150.00,0,NULL,'2026-07-10 13:07:51'),(2,1,1,2,2026,150.00,0,NULL,'2026-07-10 13:07:53'),(4,2,1,3,2026,30.00,0,NULL,'2026-07-13 08:55:31'),(5,2,1,4,2026,30.00,0,NULL,'2026-07-13 08:55:33'),(7,3,1,5,2026,300.00,0,NULL,'2026-07-13 09:08:37'),(8,3,1,6,2026,300.00,0,NULL,'2026-07-13 09:08:39'),(10,4,6,3,2026,300.00,0,NULL,'2026-07-13 09:10:46'),(11,4,6,4,2026,300.00,0,NULL,'2026-07-13 09:10:48'),(12,4,6,5,2026,300.00,0,NULL,'2026-07-13 09:10:49'),(13,5,6,7,2026,300.00,0,NULL,'2026-07-13 09:15:53'),(14,6,3,1,2026,105.00,0,NULL,'2026-07-13 09:17:19'),(18,7,3,2,2026,150.00,0,NULL,'2026-07-13 09:31:34'),(23,8,3,3,2026,300.00,0,NULL,'2026-07-13 09:35:37'),(26,9,2,1,2026,150.00,0,NULL,'2026-07-13 09:43:45'),(29,10,2,1,2026,52.50,0,NULL,'2026-07-13 09:46:40'),(30,10,2,2,2026,52.50,0,NULL,'2026-07-13 09:46:42'),(31,10,2,3,2026,52.50,0,NULL,'2026-07-13 09:46:42'),(34,11,2,6,2026,75.00,0,NULL,'2026-07-13 09:54:02'),(35,12,5,1,2026,150.00,0,NULL,'2026-07-13 09:55:24'),(38,12,5,2,2026,150.00,0,NULL,'2026-07-13 09:56:40'),(40,13,5,5,2026,150.00,0,NULL,'2026-07-13 09:59:21'),(41,13,5,6,2026,150.00,0,NULL,'2026-07-13 09:59:23'),(42,14,4,2,2026,300.00,0,NULL,'2026-07-13 10:02:08'),(45,14,4,3,2026,300.00,0,NULL,'2026-07-13 10:05:57'),(47,15,4,5,2026,75.00,0,NULL,'2026-07-13 10:08:13'),(49,16,4,6,2026,300.00,0,NULL,'2026-07-13 10:10:49'),(50,13,5,7,2026,150.00,0,NULL,'2026-08-02 14:02:56'),(51,17,5,8,2026,300.00,0,NULL,'2026-08-02 14:34:32'),(52,16,4,7,2026,300.00,0,NULL,'2026-08-03 07:05:47'),(53,11,2,7,2026,75.00,0,NULL,'2026-08-03 07:29:14'),(54,3,1,7,2026,300.00,0,NULL,'2026-08-03 07:31:17');
/*!40000 ALTER TABLE `loan_interest_accruals` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-04 13:49:19

SET FOREIGN_KEY_CHECKS=1;

